// Uso: node build_starlink_json.js in.tle out.json meta.json
//
// Le um arquivo TLE em texto (formato CelesTrak: 3 linhas por satelite ->
// nome, linha 1, linha 2) e gera:
//   - out.json : array consumido pelo dashboard [{name, noradId, line1, line2}]
//   - meta.json: {count, source, updatedAt}
//
// Substitui a antiga fonte SpaceX API v4 (descontinuada / TLEs congelados em 2022).

const fs = require("fs");

function parseTleText(text) {
  // Normaliza CRLF, remove espacos a direita (preservando colunas) e linhas vazias
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map(l => l.replace(/\s+$/g, ""))
    .filter(l => l.length > 0);

  const list = [];
  let i = 0;

  while (i < lines.length) {
    // Caso 1: TLE de 2 linhas (sem nome) -> deriva o nome do NORAD
    if (lines[i].startsWith("1 ") &&
        i + 1 < lines.length &&
        lines[i + 1].startsWith("2 ")) {
      const line1 = lines[i];
      const line2 = lines[i + 1];
      const noradId = line1.substring(2, 7).trim();
      list.push({ name: `STARLINK-${noradId}`, noradId, line1, line2 });
      i += 2;
      continue;
    }

    // Caso 2: formato padrao de 3 linhas (nome, line1, line2)
    const name  = lines[i].trim();
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    if (line1 && line2 && line1.startsWith("1 ") && line2.startsWith("2 ")) {
      const noradId = line1.substring(2, 7).trim();
      list.push({ name, noradId, line1, line2 });
      i += 3;
    } else {
      // Linha solta / fora de formato: pula sem quebrar o parsing
      i += 1;
    }
  }

  return list;
}

function build(inputPath, outPath, metaPath) {
  const text = fs.readFileSync(inputPath, "utf8");
  const list = parseTleText(text);

  if (list.length === 0) {
    console.error("Nenhum TLE valido encontrado em " + inputPath);
    process.exit(1);
  }

  // Ordena por NORAD (numerico quando possivel; cai para string em Alpha-5)
  list.sort((a, b) => {
    const na = Number(a.noradId);
    const nb = Number(b.noradId);
    if (Number.isNaN(na) || Number.isNaN(nb)) {
      return String(a.noradId).localeCompare(String(b.noradId));
    }
    return na - nb;
  });

  const meta = {
    count: list.length,
    source: "https://celestrak.org (GROUP=starlink)",
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(outPath, JSON.stringify(list, null, 2));
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`Gerado: ${outPath} (${list.length} sats) e ${metaPath}`);
}

const [, , inPath, outPath, metaPath] = process.argv;
if (!inPath || !outPath || !metaPath) {
  console.error("Uso: node build_starlink_json.js in.tle out.json meta.json");
  process.exit(1);
}

build(inPath, outPath, metaPath);
