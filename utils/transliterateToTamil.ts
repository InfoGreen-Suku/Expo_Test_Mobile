const INPUTTOOLS_REQUEST = "https://inputtools.google.com/request";

type InputToolsResponse = [string, unknown];

/** Transliterates Latin/Roman text to Tamil script via Google Input Tools (undocumented; may change). */
export async function transliterateLatinToTamil(
  text: string,
  numSuggestions = 1,
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    text: trimmed,
    itc: "ta-t-i0-und",
    num: String(numSuggestions),
    cp: "0",
    cs: "1",
    ie: "utf-8",
    oe: "utf-8",
    app: "expo",
  });

  const res = await fetch(`${INPUTTOOLS_REQUEST}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as InputToolsResponse;
  if (!Array.isArray(data) || data[0] !== "SUCCESS") return null;

  const blocks = data[1];
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  const firstBlock = blocks[0];
  if (!Array.isArray(firstBlock) || firstBlock.length < 2) return null;

  const suggestions = firstBlock[1];
  if (!Array.isArray(suggestions) || suggestions.length === 0) return null;

  const top = suggestions[0];
  return typeof top === "string" ? top : null;
}
