export var buildGenericPrompt = (prompt: string): string =>
    [
        "You are an assistant inside the Knowledge Hub API.",
        "Answer clearly and helpfully.",
        "",
        "User request:",
        prompt,
    ].join("\n");