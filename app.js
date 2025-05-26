let allEntries = [];
let filteredEntries = [];
let tagsSet = new Set();

document.getElementById("upload").addEventListener("change", handleFiles);
document.getElementById("searchInput").addEventListener("input", searchEntries);

function handleFiles(event) {
  const files = event.target.files;
  allEntries = [];
  tagsSet.clear();

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const source = file.name.includes("1") ? "Analyst 1" : "Analyst 2";

      jsonData.forEach(entry => {
        const cleanEntry = {
          title: entry.Title || entry.Headline || "Untitled",
          notes: entry.Notes || entry.Details || "",
          company: entry.Company || "",
          sector: entry.Sector || "",
          source,
          tags: []
        };

        if (cleanEntry.company) cleanEntry.tags.push(cleanEntry.company);
        if (cleanEntry.sector) cleanEntry.tags.push(cleanEntry.sector);
        tagsSet.add(cleanEntry.company);
        tagsSet.add(cleanEntry.sector);

        allEntries.push(cleanEntry);
      });

      filteredEntries = deduplicate(allEntries);
      renderTags();
      renderResults(filteredEntries);
    };
    reader.readAsArrayBuffer(file);
  });
}

function deduplicate(entries) {
  const map = new Map();
  entries.forEach(entry => {
    const key = entry.title.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, { ...entry, sources: [entry.source] });
    } else {
      const existing = map.get(key);
      existing.sources.push(entry.source);
      existing.notes += `

${entry.source}: ${entry.notes}`;
    }
  });
  return Array.from(map.values());
}

function renderTags() {
  const container = document.getElementById("tagsContainer");
  container.innerHTML = "";
  tagsSet.forEach(tag => {
    if (!tag) return;
    const span = document.createElement("span");
    span.className = "tag";
    span.innerText = tag;
    span.onclick = () => {
      const filtered = filteredEntries.filter(entry => entry.tags.includes(tag));
      renderResults(filtered);
    };
    container.appendChild(span);
  });
}

function renderResults(entries) {
  const results = document.getElementById("results");
  results.innerHTML = "";
  entries.forEach(entry => {
    const card = document.createElement("div");
    card.className = "card news-card";

    card.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">${entry.title}</h5>
        <p class="card-text">${entry.notes.replaceAll("\n", "<br>")}</p>
        <p><strong>Companies:</strong> ${entry.company} | <strong>Sector:</strong> ${entry.sector}</p>
        <p><strong>Sources:</strong> ${entry.sources.join(", ")}</p>
      </div>
    `;

    results.appendChild(card);
  });
}

function searchEntries(e) {
  const query = e.target.value;
  if (!query) {
    renderResults(filteredEntries);
    return;
  }

  const fuse = new Fuse(filteredEntries, {
    keys: ['title', 'notes', 'company', 'sector'],
    threshold: 0.3
  });
  const result = fuse.search(query).map(res => res.item);
  renderResults(result);
}
