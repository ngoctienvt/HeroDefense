/** Bounded data readers: source text is parsed, never evaluated or executed. */
export function cleanText(value: string): string {
  return value.replace(/\|c[\da-f]{8}/gi, '').replace(/\|r/g, '').replace(/\|n/g, '\n').trim();
}

export function readSection(text: string, id: string): Record<string, string> {
  const sections = text.split(/\r?\n(?=\[)/);
  const section = sections.find((part) => part.startsWith(`[${id}]`));
  if (!section) throw new Error(`Missing source section ${id}`);
  return Object.fromEntries(section.split(/\r?\n/).flatMap((line) => {
    const separator = line.indexOf('=');
    return separator < 0 ? [] : [[line.slice(0, separator), line.slice(separator + 1)]];
  }));
}

export function readCsv(text: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index++; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) { values.push(value); value = ''; }
    else value += character;
  }
  if (quoted) throw new Error('Unterminated CSV string in source evidence');
  values.push(value);
  return values;
}

export function readSlk(text: string): Map<string, Record<string, string>> {
  const rows = new Map<number, Map<number, string>>();
  let x = 1;
  let y = 1;
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('C;')) continue;
    const coordinateX = /(?:^|;)X(\d+)/.exec(line);
    const coordinateY = /(?:^|;)Y(\d+)/.exec(line);
    if (coordinateX) x = Number(coordinateX[1]);
    if (coordinateY) y = Number(coordinateY[1]);
    const value = /(?:^|;)K(.*)$/.exec(line)?.[1];
    if (value === undefined) continue;
    const row = rows.get(y) ?? new Map<number, string>();
    row.set(x, value.replace(/^"|"$/g, ''));
    rows.set(y, row);
  }
  const headers = rows.get(1);
  if (!headers) throw new Error('Missing SLK header');
  return new Map([...rows.entries()].filter(([index]) => index > 1).map(([, row]) => [
    row.get(1) ?? '',
    Object.fromEntries([...row].map(([column, value]) => [headers.get(column) ?? `column-${column}`, value])),
  ]));
}

export function sourceInteger(value: string): number {
  const result = value.startsWith('$') ? Number.parseInt(value.slice(1), 16) : Number(value);
  if (!Number.isInteger(result)) throw new Error(`Unsupported source integer ${value}`);
  return result;
}
