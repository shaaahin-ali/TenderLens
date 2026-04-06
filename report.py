from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

def generate_report(results, filename="report.pdf"):
    doc = SimpleDocTemplate(filename)
    styles = getSampleStyleSheet()
    
    content = []

    # Title
    content.append(Paragraph("Tender Compliance Report", styles["Title"]))
    content.append(Spacer(1, 20))

    # Summary
    total = len(results)
    met = sum(1 for r in results if r["verdict"] == "Met")
    partial = sum(1 for r in results if "Partial" in r["verdict"])
    not_met = sum(1 for r in results if r["verdict"] == "Not Met")

    summary = f"""
    Total: {total} <br/>
    Met: {met} <br/>
    Partial: {partial} <br/>
    Not Met: {not_met}
    """
    content.append(Paragraph(summary, styles["Normal"]))
    content.append(Spacer(1, 20))

    # Details
    for r in results:
        text = f"""
        <b>Requirement:</b> {r['requirement']} <br/>
        <b>Category:</b> {r['category']} <br/>
        <b>Verdict:</b> {r['verdict']} <br/>
        <b>Confidence:</b> {r['confidence']}% <br/>
        <b>Evidence:</b> {r['evidence']} <br/>
        """
        content.append(Paragraph(text, styles["Normal"]))
        content.append(Spacer(1, 15))

    doc.build(content)