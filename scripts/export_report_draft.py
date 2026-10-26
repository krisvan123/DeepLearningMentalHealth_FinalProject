"""Export an unmistakably INCOMPLETE academic draft PDF using ReportLab.

Install reportlab, then: python -m scripts.export_report_draft --output MindCare_Report_DRAFT.pdf
The result is not submission-ready while [NEEDS EVIDENCE] markers remain.
"""
import argparse
import html
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--input",type=Path,default=ROOT/"docs/FINAL_REPORT_DRAFT.md")
    parser.add_argument("--output",type=Path,default=ROOT/"docs/MindCare_Report_DRAFT.pdf")
    args=parser.parse_args()
    source=args.input.read_text(encoding="utf-8")
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle,getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    face="Helvetica"
    font=Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    if font.exists():
        pdfmetrics.registerFont(TTFont("MindCareDejaVu",str(font)))
        face="MindCareDejaVu"
    parent=getSampleStyleSheet()["Normal"]
    def make(name,size,leading,after):
        return ParagraphStyle(name,parent=parent,fontName=face,fontSize=size,leading=leading,spaceAfter=after,
                              textColor=colors.HexColor("#202020"))
    title=make("TitleMC",19,27,14)
    heading=make("HeadingMC",13,20,13)
    subheading=make("SubHeadingMC",10.5,17,8)
    body=make("BodyMC",9.5,15,7)
    small=make("SmallMC",8.5,13,5)
    doc=SimpleDocTemplate(str(args.output),pagesize=A4,leftMargin=22*mm,rightMargin=22*mm,
        topMargin=24*mm,bottomMargin=22*mm,title="MindCare Academic Report DRAFT")
    def text(value):
        value=html.escape(value,quote=False)
        value=re.sub(r"\*\*(.+?)\*\*",r"<b>\1</b>",value)
        return value.replace("—","&mdash;").replace(" → "," &rarr; ")
    def footer(canvas,doc):
        canvas.saveState()
        w,h=A4
        canvas.setStrokeColor(colors.HexColor("#d0d0d0"))
        canvas.line(22*mm,19*mm,w-22*mm,19*mm)
        canvas.setFillColor(colors.HexColor("#666666"))
        canvas.setFont("Helvetica",8)
        canvas.drawString(22*mm,14*mm,"DRAFT — MISSING EVIDENCE, TEAM APPROVAL & FINAL EXPERIMENTS")
        canvas.drawRightString(w-22*mm,14*mm,f"Page {doc.page}")
        canvas.restoreState()
    story=[Spacer(1,42*mm),Paragraph("MINDCARE",title),
        Paragraph("Mental Health Text Classification using Bidirectional LSTM",heading),
        Spacer(1,16*mm),Paragraph("COMP6826001 — Deep Learning Final Project",body),
        Spacer(1,15*mm),Paragraph("ACADEMIC DRAFT — NOT READY FOR FINAL SUBMISSION",heading),
        Paragraph("Dataset sources and licenses, final experiments, team attribution and video evidence are still required.",body),
        PageBreak()]
    started=False
    for raw in source.splitlines():
        line=raw.strip()
        if not line:continue
        if line=="---":
            story.append(Spacer(1,6))
        elif line.startswith("# "):
            continue
        elif line.startswith("## "):
            if started:story.append(PageBreak())
            story.append(Paragraph(text(line[3:]),heading))
            started=True
        elif line.startswith("### "):
            story.append(Spacer(1,5))
            story.append(Paragraph(text(line[4:]),subheading))
        elif line.startswith("|"):
            if "---" not in line:story.append(Paragraph(text(line.replace("|"," • ")),small))
        elif line.startswith("- ") or re.match(r"^\d+\.\s",line):
            story.append(Paragraph("• "+text(re.sub(r"^(?:-|\d+\.)\s+","",line)),body))
        elif line.startswith(">"):
            story.append(Paragraph(text(line[1:].strip()),small))
        else:
            story.append(Paragraph(text(line),body))
    args.output.parent.mkdir(parents=True,exist_ok=True)
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    print("Created DRAFT PDF:",args.output)
    print("WARNING: Unverified dataset/provenance/results/team fields remain.")

if __name__=="__main__":
    main()
