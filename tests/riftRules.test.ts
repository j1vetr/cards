import { describe, expect, it } from "vitest";
import { parseRiftRules, tokenizeRiftRules, RIFT_KEYWORDS, RIFT_SYMBOLS } from "../shared/riftRules";

describe("Riftbound safe rule formatting", () => {
  it("handles adjacent energy and rune costs without dropping numbers", () => {
    expect(tokenizeRiftRules(":rb_energy_1::rb_rune_fury:")).toEqual([
      { kind: "symbol", name: "energy", value: 1, raw: ":rb_energy_1:" },
      { kind: "symbol", name: "fury", raw: ":rb_rune_fury:" },
    ]);
    expect(tokenizeRiftRules(":rb_energy_0: :rb_energy_12:").filter(t => t.kind === "symbol").map(t => t.value)).toEqual([0, 12]);
  });
  it("recognizes every source rune, Might and Exhaust", () => {
    for (const name of ["fury", "calm", "mind", "body", "chaos", "order", "rainbow"]) {
      expect(tokenizeRiftRules(`:rb_rune_${name}:`)[0]).toMatchObject({ kind: "symbol", name });
    }
    expect(tokenizeRiftRules(":rb_might: :rb_exhaust:").filter(t => t.kind === "symbol").map(t => t.name)).toEqual(["might", "exhaust"]);
    expect(RIFT_SYMBOLS.rainbow.asset).toBe("/icons/riftbound/wild.svg");
  });
  it("keeps all known keyword names and numeric modifiers", () => {
    for (const name of RIFT_KEYWORDS) {
      expect(tokenizeRiftRules(`[${name}]`)[0]).toMatchObject({ kind: "keyword", label: name });
    }
    expect(tokenizeRiftRules("[assault 2] [ADD] [Level 16]").filter(t => t.kind === "keyword").map(t => t.label))
      .toEqual(["Assault 2", "Add", "Level 16"]);
  });
  it("distinguishes activation separators from costs and keywords", () => {
    expect(tokenizeRiftRules("[>] [>>]").filter(t => t.kind === "activation").map(t => t.doubled)).toEqual([false, true]);
  });
  it("preserves real bulleted choices from rich source rather than concatenated plain text", () => {
    const blocks = parseRiftRules("Choose oneDeal 2.Stun a unit.", "<p>Choose one</p><ul><li>Deal 2.</li><li>Stun a unit.</li></ul>");
    expect(blocks.map(b => b.kind)).toEqual(["paragraph", "list"]);
    expect(blocks[1].lines).toHaveLength(2);
    expect(blocks[1].lines[1]).toEqual([{ kind: "text", text: "Stun a unit." }]);
  });
  it("does not execute or preserve upstream scripts, event handlers, frames or HTML attributes", () => {
    const blocks = parseRiftRules("", '<p onclick="evil()">Safe &amp; sound :rb_might:</p><img src=x onerror="evil()"><script>steal()</script><iframe>unsafe()</iframe>');
    const serialized = JSON.stringify(blocks);
    expect(serialized).toContain("Safe & sound");
    for (const unsafe of ["evil", "onclick", "onerror", "steal", "unsafe", "<img"]) expect(serialized).not.toContain(unsafe);
  });
  it("decodes entities into text once and never into executable markup", () => {
    const tokens = parseRiftRules("", "<p>&quot;A&amp;B&quot; &#49; &#x32; &lt;safe&gt; &amp;lt;script&amp;gt;</p>")[0].lines[0];
    expect(tokens).toEqual([{ kind: "text", text: '"A&B" 1 2 <safe> &lt;script&gt;' }]);
  });
  it("preserves unknown future codes and bracketed phrases without inventing meanings", () => {
    const tokens = tokenizeRiftRules(":rb_new_resource: [Future Keyword] ordinary text");
    expect(tokens[0]).toEqual({ kind: "unknown", label: "new resource", raw: ":rb_new_resource:" });
    expect(tokens.filter(t => t.kind === "text").map(t => t.text).join("")).toContain("[Future Keyword]");
  });
  it.each([null, undefined, "", "  ", "[NO TEXT]", "\n[no text]\n"])("treats missing rules honestly: %s", value => {
    expect(parseRiftRules(value)).toEqual([]);
  });
  it("preserves ordinary newlines and manually edited descriptions without HTML requirements", () => {
    const blocks = parseRiftRules("First line\r\n[Action] Second line\n• Choice one\n• Choice two");
    expect(blocks.map(b => b.kind)).toEqual(["paragraph", "list"]);
    expect(blocks[0].lines).toHaveLength(2);
    expect(blocks[1].lines).toHaveLength(2);
  });
});
