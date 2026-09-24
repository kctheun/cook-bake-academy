const csvColumns = ["ref", "submitted", "course_code", "course_title", "intake", "full_name", "email", "mobile", "experience", "allergies", "marketing_opt_in", "paid"];
const exportButton = document.querySelector("#export-signups");
const count = document.querySelector("#admin-count");
const error = document.querySelector("#admin-error");
const empty = document.querySelector("#admin-empty");
const table = document.querySelector("#admin-table-wrap");
const rows = document.querySelector("#signup-rows");
let signups = [];

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

try {
  const saved = localStorage.getItem("cb_signups");
  signups = saved ? JSON.parse(saved) : [];
  if (!Array.isArray(signups)) throw new Error("Invalid sign-up data");
  count.textContent = `${signups.length} ${signups.length === 1 ? "sign-up" : "sign-ups"} on this device`;
  empty.hidden = signups.length !== 0;
  table.hidden = signups.length === 0;
  exportButton.disabled = signups.length === 0;
  rows.replaceChildren(...signups.map(signup => {
    const row = document.createElement("tr");
    csvColumns.forEach(column => {
      const cell = document.createElement("td");
      cell.textContent = signup[column] ?? "";
      row.append(cell);
    });
    return row;
  }));
} catch {
  error.hidden = false;
  count.textContent = "";
}

exportButton.addEventListener("click", () => {
  const csv = [csvColumns.join(","), ...signups.map(signup => csvColumns.map(column => csvCell(signup[column])).join(","))].join("\r\n") + "\r\n";
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `cook-bake-signups-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
