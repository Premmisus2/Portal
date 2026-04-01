export async function downloadPDF(title: string) {
  const el = document.querySelector('.print-area');
  if (!el) { window.print(); return; }

  try {
    const html2pdf = (await import('html2pdf.js')).default;
    const hidden: [HTMLElement, string][] = [];
    el.querySelectorAll('.no-print').forEach((n) => {
      const htmlEl = n as HTMLElement;
      hidden.push([htmlEl, htmlEl.style.display]);
      htmlEl.style.display = 'none';
    });

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Premmisus-${(title || 'Sales-Portal').replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.97 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#000000', logging: false, windowWidth: 960 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    };

    await html2pdf().set(opt).from(el).save();
    hidden.forEach(([n, d]) => { n.style.display = d; });
  } catch {
    window.print();
  }
}
