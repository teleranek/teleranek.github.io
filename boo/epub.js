async function extractEpubText(epubZip) {
  // 1. Find OPF path from META-INF/container.xml
  const containerXml = await epubZip
    .file("META-INF/container.xml")
    .async("string");

  const parser = new DOMParser();

  const containerDoc = parser.parseFromString(
    containerXml,
    "application/xml"
  );

  const rootfile = containerDoc.querySelector("rootfile");
  const opfPath = rootfile.getAttribute("full-path");

  // 2. Read OPF package document
  const opfXml = await epubZip.file(opfPath).async("string");

  const opfDoc = parser.parseFromString(opfXml, "application/xml");

  // Base directory for resolving relative hrefs
  const opfDir = opfPath.includes("/")
    ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1)
    : "";

  // 3. Build manifest map: id -> item
  const manifest = new Map();

  opfDoc.querySelectorAll("manifest > item").forEach(item => {
    manifest.set(item.getAttribute("id"), {
      href: item.getAttribute("href"),
      mediaType: item.getAttribute("media-type"),
      properties: item.getAttribute("properties") || ""
    });
  });

  // 4. Iterate spine in reading order
  const parts = [];

  const spineRefs = opfDoc.querySelectorAll("spine > itemref");

  for (const itemref of spineRefs) {
    const idref = itemref.getAttribute("idref");
    const item = manifest.get(idref);

    if (!item) continue;

    // 5. Skip navigation docs / TOC
    const isNav =
      item.properties.includes("nav") ||
      item.mediaType === "application/x-dtbncx+xml";

    if (isNav) continue;

    // Usually actual book content is XHTML/HTML
    const isHtml =
      item.mediaType === "application/xhtml+xml" ||
      item.mediaType === "text/html";

    if (!isHtml) continue;

    const contentPath = opfDir + item.href;

    const file = epubZip.file(contentPath);

    if (!file) continue;

    const html = await file.async("string");
    const text = new DOMParser()
        .parseFromString(html, "text/html")
        .body
        .textContent
        .replace(/\s+/g, " ")
        .trim();

    parts.push(text);
  }

  // 6. Concatenate
  return parts.join("\n");
}


async function parseEpubZip(fileBuffer) {
    var zip = new JSZip();
    await zip.loadAsync(fileBuffer, {type: 'binary'});

    const text = await extractEpubText(zip);

    return text;
}

export { parseEpubZip, extractEpubText };