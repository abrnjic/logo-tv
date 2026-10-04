export const OWNER_ID = 6376177;
const REPO = "abrnjic/logo-tv";
const API = "https://api.github.com";
const METADATA_PATH = "web/catalogue-overrides.json";
const decode = (text) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(text.replace(/\s/g, "")), (char) =>
      char.charCodeAt(0),
    ),
  );

export function validateFields(fields) {
  for (const key of ["name", "country", "category"]) {
    if (
      typeof fields[key] !== "string" ||
      !fields[key].trim() ||
      fields[key].length > 120 ||
      /[<>"\r\n]/.test(fields[key]) ||
      [...fields[key]].some((character) => character.charCodeAt(0) < 32)
    )
      throw new Error(
        "Ispuni naziv, državu i kategoriju (do 120 znakova, bez navodnika ili posebnih oznaka).",
      );
  }
  return {
    name: fields.name.trim(),
    country: fields.country.trim(),
    category: fields.category.trim(),
  };
}
export function validatePng(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length < 33 ||
    bytes.length > 5 * 1024 * 1024 ||
    !signature.every((value, index) => bytes[index] === value)
  )
    throw new Error("Odaberi valjanu PNG sliku do 5 MB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16),
    height = view.getUint32(20);
  if (!width || !height || width > 4096 || height > 4096)
    throw new Error("PNG dimenzije moraju biti između 1 i 4096 piksela.");
}

// Credentials live only in this closure, never in localStorage, URLs or the repository.
export function createAdminSession(token, fetcher = fetch) {
  let authorized = false;
  let expectedHead;
  let treeSha;
  let metadata;
  const request = async (path, method = "GET", body) => {
    const response = await fetcher(`${API}${path}`, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      if ([409, 422].includes(response.status))
        throw new Error(
          "Katalog je u međuvremenu promijenjen. Ponovno učitaj podatke prije spremanja.",
        );
      if ([401, 403].includes(response.status))
        throw new Error(
          "GitHub je odbio pristup. Provjeri račun i ovlasti tokena za logo-tv.",
        );
      throw new Error(`GitHub nije dovršio zahtjev (HTTP ${response.status}).`);
    }
    return response.json();
  };
  const requireOwner = () => {
    if (!authorized || !token)
      throw new Error("Uređivanje je dopušteno samo vlasniku abrnjic.");
  };
  return {
    async login() {
      if (!token || !token.startsWith("github_pat_"))
        throw new Error(
          "Koristi fine-grained GitHub token ograničen na repozitorij logo-tv.",
        );
      const user = await request("/user");
      if (user.id !== OWNER_ID || user.login !== "abrnjic")
        throw new Error(
          "Ovaj GitHub račun nema pristup upravljanju. Dopušten je samo abrnjic.",
        );
      const repo = await request(`/repos/${REPO}`);
      if (repo.owner?.id !== OWNER_ID)
        throw new Error("Vlasnik repozitorija ne odgovara dopuštenom računu.");
      authorized = true;
      return this.refresh();
    },
    async refresh() {
      requireOwner();
      const ref = await request(`/repos/${REPO}/git/ref/heads/main`);
      const head = ref.object.sha;
      const commit = await request(`/repos/${REPO}/git/commits/${head}`);
      const file = await request(
        `/repos/${REPO}/contents/${METADATA_PATH}?ref=${head}`,
      );
      const incoming = JSON.parse(decode(file.content));
      if (
        incoming.version !== 1 ||
        !incoming.channels ||
        Array.isArray(incoming.channels)
      )
        throw new Error("Nepoznat oblik kataloga. Spremanje je zaustavljeno.");
      expectedHead = head;
      treeSha = commit.tree.sha;
      metadata = incoming;
      return structuredClone(metadata);
    },
    async save({
      id,
      fields,
      imageBytes,
      sourcePath,
      hidden = false,
      preferred = false,
      ids = [id],
      isNew = false,
    }) {
      requireOwner();
      if (
        !/^[a-z0-9][a-z0-9._-]{0,149}$/i.test(id) ||
        ["__proto__", "constructor", "prototype"].includes(id)
      )
        throw new Error("Neispravna oznaka kanala.");
      if (
        !Array.isArray(ids) ||
        !ids.length ||
        ids.length > 100 ||
        !ids.includes(id) ||
        ids.some(
          (value) =>
            !/^[a-z0-9][a-z0-9._-]{0,149}$/i.test(value) ||
            ["__proto__", "constructor", "prototype"].includes(value),
        )
      )
        throw new Error("Neispravne oznake varijanti kanala.");
      // New uploads always enter the visible catalogue. Hiding is a later edit.
      if (isNew) hidden = false;
      const values = validateFields(fields);
      if (imageBytes) {
        validatePng(imageBytes);
        if (
          !/^logos\/[a-z0-9._/-]+\.png$/i.test(sourcePath) ||
          sourcePath.includes("..")
        )
          throw new Error("Neispravna putanja PNG datoteke.");
      }
      const ref = await request(`/repos/${REPO}/git/ref/heads/main`);
      if (ref.object.sha !== expectedHead)
        throw new Error(
          "Katalog je promijenjen. Klikni Ponovno učitaj podatke i ponovi izmjenu.",
        );
      const next = structuredClone(metadata);
      for (const variantId of ids)
        next.channels[variantId] = {
          ...next.channels[variantId],
          ...values,
          hidden: Boolean(hidden),
          preferred: variantId === id && Boolean(preferred),
        };
      if (isNew) {
        if (!imageBytes || !sourcePath?.startsWith("logos/custom/"))
          throw new Error("Novi kanal zahtijeva PNG logotip.");
        if (next.channels[id].added && metadata.channels[id])
          throw new Error("Ta oznaka kanala već postoji.");
        next.channels[id] = { ...next.channels[id], added: true, sourcePath };
      }
      const entries = [];
      if (imageBytes) {
        let binary = "";
        for (const byte of imageBytes) binary += String.fromCharCode(byte);
        const blob = await request(`/repos/${REPO}/git/blobs`, "POST", {
          content: btoa(binary),
          encoding: "base64",
        });
        entries.push({
          path: sourcePath,
          mode: "100644",
          type: "blob",
          sha: blob.sha,
        });
      }
      entries.push({
        path: METADATA_PATH,
        mode: "100644",
        type: "blob",
        content: JSON.stringify(next, null, 2) + "\n",
      });
      const tree = await request(`/repos/${REPO}/git/trees`, "POST", {
        base_tree: treeSha,
        tree: entries,
      });
      const commit = await request(`/repos/${REPO}/git/commits`, "POST", {
        message: `Catalogue: ${hidden ? "hide" : "save"} ${values.name} (${values.country})`,
        tree: tree.sha,
        parents: [expectedHead],
      });
      await request(`/repos/${REPO}/git/refs/heads/main`, "PATCH", {
        sha: commit.sha,
        force: false,
      });
      // Verify the commit is actually the published source; never overwrite a conflict.
      const readback = await request(`/repos/${REPO}/git/ref/heads/main`);
      if (readback.object.sha !== commit.sha)
        throw new Error(
          "Izmjena je poslana, ali objavljena verzija se promijenila. Ponovno učitaj podatke radi provjere.",
        );
      metadata = next;
      expectedHead = commit.sha;
      treeSha = tree.sha;
      return { metadata: structuredClone(next), sha: commit.sha };
    },
    logout() {
      authorized = false;
      token = "";
      metadata = null;
      expectedHead = null;
      treeSha = null;
    },
  };
}
