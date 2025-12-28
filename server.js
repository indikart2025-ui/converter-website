const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const archiver = require("archiver");

const app = express();
app.use(express.static(__dirname));

const upload = multer({ dest: "uploads/" });

// ✅ Poppler path
const POPPLER_PATH = "C:\\poppler-25.12.0\\Library\\bin";

app.post("/convert-pdf-to-jpg", upload.single("pdf"), (req, res) => {
  if (!req.file) {
    return res.status(400).end();
  }

  const pdfPath = path.resolve(req.file.path);
  const outputDir = path.join(__dirname, "output");

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const jobId = Date.now().toString();
  const outputPrefix = path.join(outputDir, jobId);

  const command = `"${POPPLER_PATH}\\pdftoppm.exe" -jpeg "${pdfPath}" "${outputPrefix}"`;

  exec(command, (err) => {
    if (err) {
      console.error("PDF CONVERT ERROR:", err);
      return res.status(500).end();
    }

    const zipPath = path.join(outputDir, `${jobId}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      // ✅ ZIP ready → now download
      res.download(zipPath, "pdf-to-jpg.zip", () => {
        // cleanup
        fs.unlink(zipPath, () => {});
      });
    });

    archive.on("error", err => {
      console.error("ZIP ERROR:", err);
      res.status(500).end();
    });

    archive.pipe(output);

    fs.readdirSync(outputDir)
      .filter(file => file.startsWith(jobId) && file.endsWith(".jpg"))
      .forEach(file => {
        archive.file(path.join(outputDir, file), { name: file });
      });

    archive.finalize();
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});


