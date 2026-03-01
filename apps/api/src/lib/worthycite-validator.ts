import xss from "xss";

export interface CiteCoreValidationResult {
    isValid: boolean;
    errors: string[];
    sanitizedContent: string;
}

export const validateAndSanitizeContent = (content: string): CiteCoreValidationResult => {
    const errors: string[] = [];

    // Check length
    if (!content || content.trim().length < 100) {
        errors.push("Content must be at least 100 characters long to provide sufficient context for optimization.");
    }

    if (content.length > 50000) {
        errors.push("Content exceeds the maximum allowed length of 50,000 characters.");
    }

    // Sanitize to prevent malicious XSS payloads before AI consumption
    const sanitizedContent = xss(content, {
        whiteList: {}, // Strip all HTML tags entirely for clean text extraction
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'style']
    });

    return {
        isValid: errors.length === 0,
        errors,
        sanitizedContent
    };
};
