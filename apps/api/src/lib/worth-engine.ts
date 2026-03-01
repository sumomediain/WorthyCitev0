import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface OptimizationResult {
    content: string;
    metadata: {
        score: number;
        seoTitles: string[];
        metaDescription: string;
        faqs: { question: string, answer: string }[];
    }
}

class WorthEnginePipeline {

    async execute(draftContent: string): Promise<OptimizationResult> {
        console.log("[WorthEngine] Starting 5-Stage Pipeline...");

        // Stage 1: ContentBrief Extraction
        const brief = await this.extractBrief(draftContent);

        // Stage 2: SEO Pack
        const seoPack = await this.generateSEOPack(brief);

        // Stage 3: GEO Pack (Generative Engine Optimization)
        const geoPack = await this.generateGEOPack(brief);

        // Stage 4: Composer
        const finalContent = await this.composeMarkdown(draftContent, seoPack, geoPack);

        // Stage 5: Quality Check
        const score = await this.qualityCheck(finalContent);

        console.log("[WorthEngine] Pipeline Completed. Score:", score);

        return {
            content: finalContent,
            metadata: {
                score,
                seoTitles: seoPack.titles,
                metaDescription: seoPack.metaDescription,
                faqs: seoPack.faqs
            }
        };
    }

    private async extractBrief(content: string) {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Extract a concise brief representing the core topical intent, target audience, and primary keywords of the provided content. Output ONLY JSON with keys: mainTopic, targetAudience, keywords." },
                { role: "user", content: content }
            ],
            response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0]?.message?.content || "{}");
    }

    private async generateSEOPack(brief: any) {
        const prompt = `Based on this brief, generate SEO assets. Brief: ${JSON.stringify(brief)}. Output JSON with keys: titles (array of 3 strong H1s), metaDescription (string < 160 chars), outline (array of H2 topics), faqs (array of {question, answer}).`;
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are an expert SEO strategist. Always respond in valid JSON." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0]?.message?.content || "{}");
    }

    private async generateGEOPack(brief: any) {
        const prompt = `Generate Generative Engine Optimization (GEO) assets for Google SGE/Perplexity. Brief: ${JSON.stringify(brief)}. Output JSON with keys: directAnswer (concise 50-word answer block), keyFacts (array of 3-5 statistical/factual bullets).`;
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are an expert at optimizing for AI overviews. Always respond in valid JSON." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0]?.message?.content || "{}");
    }

    private async composeMarkdown(draft: string, seo: any, geo: any) {
        const prompt = `Rewrite and expand the following draft into a comprehensive, highly engaging, strictly formatted Markdown article.
     Use the following assets:
     - Suggested H1 Title: ${seo.titles?.[0]}
     - Direct Answer Block (put this near the top): ${geo.directAnswer}
     - Key Facts to weave in: ${JSON.stringify(geo.keyFacts)}
     - Required Outline H2s: ${JSON.stringify(seo.outline)}
     - Add the FAQs at the bottom.
     
     Ensure the tone is authoritative and human.
     Draft: ${draft}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are an elite content writer and editor. Output raw Markdown only. Do not wrap in ```markdown blocks." },
                { role: "user", content: prompt }
            ],
        });
        return response.choices[0]?.message?.content || "";
    }

    private async qualityCheck(content: string) {
        const prompt = `Score the following content from 0 to 100 on readability, topical authority, and lack of fluff. Output JSON with a single key 'score' (number). Content: \n\n${content.substring(0, 3000)}...`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // fast evaluation
            messages: [
                { role: "system", content: "You are a quality assurance editor. Output valid JSON." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });
        const result = JSON.parse(response.choices[0]?.message?.content || '{"score": 80}');
        return result.score || 80;
    }
}

export const worthEngine = new WorthEnginePipeline();
