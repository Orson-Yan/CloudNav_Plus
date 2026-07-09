import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AIConfig } from "../types";

/**
 * Helper to call OpenAI Compatible API
 */
const callOpenAICompatible = async (config: AIConfig, systemPrompt: string, userPrompt: string): Promise<string> => {
    try {
        let baseUrl = config.baseUrl.replace(/\/$/, '');
        // If user didn't provide full path, assume /v1/chat/completions logic or just trust them
        // Common convention: if URL ends with /v1, append /chat/completions
        if (!baseUrl.includes('/chat/completions')) {
            if (baseUrl.endsWith('/v1')) {
                baseUrl += '/chat/completions';
            } else {
                // If it's just a domain like api.openai.com, usually implies /v1/chat/completions
                // But let's assume user might input full path or standard base. 
                // To be safe, let's append /chat/completions if not present
                baseUrl += '/chat/completions';
            }
        }

        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("OpenAI API Error:", err);
            return "";
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || "";
    } catch (e) {
        console.error("OpenAI Call Failed", e);
        return "";
    }
};

/**
 * Uses configured AI to generate a description
 */
export const generateLinkDescription = async (title: string, url: string, config: AIConfig): Promise<string> => {
  if (!config.apiKey) {
    return "请在设置中配置 API Key";
  }

  const prompt = `
      Title: ${title}
      URL: ${url}
      Please write a very short description (max 15 words) in Chinese (Simplified) that explains what this website is for. Return ONLY the description text. No quotes.
  `;

  try {
    if (config.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        // Use user defined model or fallback
        const modelName = config.model || 'gemini-2.5-flash';
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: modelName,
            contents: `I have a website bookmark. ${prompt}`,
        });
        return response.text ? response.text.trim() : "无法生成描述";
    } else {
        // OpenAI Compatible
        const result = await callOpenAICompatible(
            config, 
            "You are a helpful assistant that summarizes website bookmarks.", 
            prompt
        );
        return result || "生成描述失败";
    }
  } catch (error) {
    console.error("AI generation error:", error);
    return "生成描述失败";
  }
};

/**
 * Suggests tags for a link. Prefers reusing existing tags to keep them consistent,
 * but may add 1-2 new ones. Returns a deduplicated array (max 4).
 */
export const suggestTags = async (title: string, url: string, existingTags: string[], config: AIConfig): Promise<string[]> => {
    if (!config.apiKey) return [];

    const tagPool = existingTags.length > 0 ? existingTags.join(', ') : '(none yet)';
    const prompt = `
        Website: "${title}" (${url})

        Existing tags in the system: ${tagPool}

        Suggest 2-4 concise tags (Chinese Simplified, single words or short phrases) for this website.
        PREFER reusing existing tags when they fit. Only invent a new tag when none of the existing ones apply.
        Return ONLY a comma-separated list of tags. No '#', no numbering, no extra text.
    `;

    try {
        let raw = '';
        if (config.provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const modelName = config.model || 'gemini-2.5-flash';
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: modelName,
                contents: `Task: Tag this website.\n${prompt}`,
            });
            raw = response.text ? response.text.trim() : '';
        } else {
            raw = await callOpenAICompatible(
                config,
                "You are a tagging assistant. You only output a comma-separated list of tags.",
                prompt
            );
        }

        if (!raw) return [];
        const seen = new Set<string>();
        const tags: string[] = [];
        raw.split(/[,，\n]/).forEach(part => {
            const t = part.trim().replace(/^#+/, '').replace(/^["']|["']$/g, '');
            if (t && !seen.has(t)) {
                seen.add(t);
                tags.push(t);
            }
        });
        return tags.slice(0, 4);
    } catch (e) {
        console.error(e);
        return [];
    }
};

/**
 * Semantic search: given a natural-language query, returns matching link ids
 * ordered by relevance. Used by the command palette when keyword search finds nothing.
 */
export const semanticSearchLinks = async (
    query: string,
    items: { id: string; title: string; url: string; description?: string; tags?: string[] }[],
    config: AIConfig
): Promise<string[]> => {
    if (!config.apiKey || !query.trim() || items.length === 0) return [];

    const list = items.map(i =>
        `${i.id} | ${i.title} | ${i.url}${i.description ? ' | ' + i.description : ''}${i.tags && i.tags.length ? ' | #' + i.tags.join(' #') : ''}`
    ).join('\n');
    const prompt = `
        User is searching their bookmarks with this query: "${query}"

        Bookmarks, one per line, formatted as: id | title | url | description | tags

        ${list}

        Understand the user's intent (semantic match, not just keyword). Return the ids of the most relevant bookmarks, most relevant first, up to 8.
        Return ONLY a comma-separated list of ids. If nothing is relevant, return an empty response.
    `;

    try {
        let raw = '';
        if (config.provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const modelName = config.model || 'gemini-2.5-flash';
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: modelName,
                contents: `Task: Semantic bookmark search.\n${prompt}`,
            });
            raw = response.text ? response.text.trim() : '';
        } else {
            raw = await callOpenAICompatible(
                config,
                "You are a semantic search engine over the user's bookmarks. You only output a comma-separated list of ids ordered by relevance.",
                prompt
            );
        }

        if (!raw) return [];
        const validIds = new Set(items.map(i => i.id));
        const ordered: string[] = [];
        raw.split(/[,，\n]/).map(s => s.trim()).forEach(id => {
            if (validIds.has(id) && !ordered.includes(id)) ordered.push(id);
        });
        return ordered.slice(0, 8);
    } catch (e) {
        console.error(e);
        return [];
    }
};

/**
 * Asks AI to identify links worth cleaning up (dead-looking, low-value or redundant).
 * Returns an array of link ids. Exact-duplicate detection is handled locally by the caller.
 */
export const findCleanupCandidates = async (
    items: { id: string; title: string; url: string; description?: string }[],
    config: AIConfig
): Promise<string[]> => {
    if (!config.apiKey || items.length === 0) return [];

    const list = items.map(i => `${i.id} | ${i.title} | ${i.url}${i.description ? ' | ' + i.description : ''}`).join('\n');
    const prompt = `
        Below is a list of bookmarks, one per line, formatted as: id | title | url | description

        ${list}

        Identify bookmarks that are good candidates for cleanup, meaning any of:
        - clearly redundant / near-duplicate of another entry
        - broken or placeholder-looking (e.g. "test", "新建", "无标题", localhost, example.com)
        - obviously low value

        Be conservative: only include entries you are fairly confident about. It is fine to return none.
        Return ONLY a comma-separated list of the matching ids. No other text. If none, return an empty response.
    `;

    try {
        let raw = '';
        if (config.provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const modelName = config.model || 'gemini-2.5-flash';
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: modelName,
                contents: `Task: Review bookmarks for cleanup.\n${prompt}`,
            });
            raw = response.text ? response.text.trim() : '';
        } else {
            raw = await callOpenAICompatible(
                config,
                "You are a careful librarian reviewing bookmarks. You only output a comma-separated list of ids.",
                prompt
            );
        }

        if (!raw) return [];
        const validIds = new Set(items.map(i => i.id));
        return raw
            .split(/[,，\n]/)
            .map(s => s.trim())
            .filter(id => validIds.has(id));
    } catch (e) {
        console.error(e);
        return [];
    }
};

/**
 * Suggests a category
 */
export const suggestCategory = async (title: string, url: string, categories: {id: string, name: string}[], config: AIConfig): Promise<string | null> => {
    if (!config.apiKey) return null;

    const catList = categories.map(c => `${c.id}: ${c.name}`).join('\n');
    const prompt = `
        Website: "${title}" (${url})

        Available Categories:
        ${catList}

        Return ONLY the 'id' of the best matching category. If unsure, return 'common'.
    `;

    try {
        if (config.provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const modelName = config.model || 'gemini-2.5-flash';
            
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: modelName,
                contents: `Task: Categorize this website.\n${prompt}`,
            });
            return response.text ? response.text.trim() : null;
        } else {
             // OpenAI Compatible
            const result = await callOpenAICompatible(
                config,
                "You are an intelligent classification assistant. You only output the category ID.",
                prompt
            );
            return result || null;
        }
    } catch (e) {
        console.error(e);
        return null;
    }
}
