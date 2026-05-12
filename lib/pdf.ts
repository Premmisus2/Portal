/* Portal PDF export.
   Uses the browser's native print pipeline (window.print → "Save as PDF").
   Why not html2pdf.js / jsPDF: html2canvas renders to a dark canvas before
   any @media print rules apply, so portal PDFs were coming out dark with
   missing headings. window.print() runs through Chrome's vector PDF path
   and honors our globals.css @media print block, which overrides every
   theme var to its light equivalent regardless of the user's selected
   theme — so saved PDFs always render as a clean light "official document"
   per the offer-page aesthetic Elliott approved.

   The `title` arg is retained for API compatibility with existing callers
   but the saved filename is controlled by the browser print dialog. */

export async function downloadPDF(_title?: string) {
  if (typeof window === 'undefined') return;
  // Allow the UI to settle (button label flip, etc.) before the modal print
  // dialog blocks the main thread.
  await new Promise((r) => setTimeout(r, 60));
  window.print();
}
