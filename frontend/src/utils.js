export const uid = () => "id-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const linesOf = (str) => String(str || "").split("\n").map(s => s.trim()).filter(Boolean).slice(0, 5);

export const initials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const a = parts[0][0] || "";
  const b = parts.length > 1 ? (parts[parts.length - 1][0] || "") : "";
  return (a + b).toUpperCase();
};

export const setPath = (obj, path, value) => {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = /^\d+$/.test(parts[i]) ? parseInt(parts[i], 10) : parts[i];
    cur = cur[key];
    if (cur == null) return;
  }
  cur[parts[parts.length - 1]] = value;
};

export const fileToSquareDataUrl = (file, size, quality) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.naturalWidth, img.naturalHeight) || 1;
        const sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        try { resolve(canvas.toDataURL("image/jpeg", quality)); } 
        catch (err) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

export const countStats = (orgData) => {
  let depts = orgData.departments?.length || 0, hods = 0, mgrs = 0, team = 0;
  (orgData.departments || []).forEach(d => {
    if (d.hod && d.hod.name && d.hod.name.trim()) hods++;
    mgrs += d.managers.length;
    d.managers.forEach(m => { team += m.team.length; });
  });
  const eas = (orgData.eas || []).length;
  let people = (orgData.leadership?.length || 0) + eas;
  (orgData.departments || []).forEach(d => {
    people += 1 + d.managers.length;
    d.managers.forEach(m => { people += m.team.length; });
  });
  return { depts, hods, eas, mgrs, team, people };
};

export const DEPT_PALETTE = ["#F0645A","#F2A93B","#23B5A6","#4E8DF5","#B15CE0","#3FBF63","#F2578C","#3FA7C9"];
export const deptColor = (colorIndex) => DEPT_PALETTE[Math.abs(colorIndex || 0) % DEPT_PALETTE.length];