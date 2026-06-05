# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## MERN PDF Clone

This project now includes a backend API for PDF upload, merge, split, and compression.

### Run locally

1. Start a local MongoDB instance.
2. Run `npm install`.
3. Run `npm run dev` to start both the React frontend and Express backend.
4. Open `http://localhost:5173` in your browser.

### Production build

1. Run `npm install`.
2. Run `npm run build` to build the React app.
3. Run `npm start` to launch the Express API and serve the production build.
4. Open `http://localhost:5000` in your browser.

### Backend API

- `POST /api/pdf/upload` - upload PDF files
- `GET /api/pdf/files` - list uploaded PDFs
- `POST /api/pdf/merge` - merge selected PDF files
- `POST /api/pdf/split` - split a PDF by page range
- `POST /api/pdf/compress` - compress a PDF file
- `POST /api/pdf/rotate` - rotate pages in a PDF file
- `POST /api/pdf/watermark` - add watermark text to a PDF
- `POST /api/pdf/page-numbers` - add page numbers to a PDF
- `POST /api/pdf/crop-pdf` - crop PDF page margins
- `POST /api/pdf/protect-pdf` - protect a PDF with a password
- `POST /api/pdf/unlock-pdf` - unlock a PDF (same-file output)
- `GET /api/pdf/download/:id` - download a processed PDF

### Notes

- The UI includes a full set of PDF tool cards and disables features that are not implemented yet.
- Core PDF operations such as merge, split, compress, rotate, watermark, page numbering, crop, protect, and unlock are fully implemented.
- Unsupported advanced conversions and editor tools are displayed as coming soon and are intentionally disabled until backend support is added.
