"""PDF statement generation using ReportLab."""
import io
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
)

NAVY = colors.HexColor('#0B132B')
GOLD = colors.HexColor('#D4AF37')
LIGHT = colors.HexColor('#F8F9FA')
BORDER = colors.HexColor('#E5E7EB')


def generate_statement_pdf(user: dict, account: dict, transactions: list, period: str = "All time") -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            leftMargin=0.6*inch, rightMargin=0.6*inch,
                            topMargin=0.6*inch, bottomMargin=0.6*inch)
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle('h1', parent=styles['Heading1'], textColor=NAVY, fontSize=20, spaceAfter=4)
    h2 = ParagraphStyle('h2', parent=styles['Heading2'], textColor=NAVY, fontSize=13, spaceAfter=4)
    gold = ParagraphStyle('gold', parent=styles['Normal'], textColor=GOLD, fontSize=11, fontName='Helvetica-Bold')
    small = ParagraphStyle('small', parent=styles['Normal'], textColor=colors.grey, fontSize=9)

    story = []
    # Header
    header = Table([
        [Paragraph('<b>LUMINA BANK</b>', ParagraphStyle('brand', fontSize=18, textColor=GOLD, fontName='Helvetica-Bold')),
         Paragraph(f'<b>Account Statement</b><br/><font size=9 color="grey">Generated {datetime.now(timezone.utc).strftime("%b %d, %Y %H:%M UTC")}</font>',
                   ParagraphStyle('headright', alignment=2, fontSize=11, textColor=NAVY))]
    ], colWidths=[3.5*inch, 3.5*inch])
    header.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), NAVY),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.white),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 16),
        ('RIGHTPADDING', (0,0), (-1,-1), 16),
        ('TOPPADDING', (0,0), (-1,-1), 14),
        ('BOTTOMPADDING', (0,0), (-1,-1), 14),
    ]))
    story.append(header)
    story.append(Spacer(1, 14))

    # Account Info
    info = Table([
        ['Account Holder', user.get('full_name', '')],
        ['Account Number', account.get('account_number', '')],
        ['Account Type', account.get('type', '').title()],
        ['Statement Period', period],
        ['Current Balance', f"${float(account.get('balance', 0)):,.2f}"],
    ], colWidths=[2*inch, 5*inch])
    info.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), LIGHT),
        ('TEXTCOLOR', (0,0), (0,-1), NAVY),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME', (1,0), (1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(info)
    story.append(Spacer(1, 16))

    story.append(Paragraph('Transaction History', h2))
    story.append(Spacer(1, 6))

    # Transactions table
    data = [['Date', 'Reference', 'Description', 'Type', 'Amount', 'Balance', 'Status']]
    for t in transactions:
        dt = t.get('created_at', '')[:16].replace('T', ' ')
        sign = '+' if t.get('direction') == 'credit' else '-'
        data.append([
            dt,
            t.get('reference', ''),
            (t.get('description') or '')[:28],
            (t.get('type') or '').replace('_', ' ').title(),
            f"{sign}${float(t.get('amount', 0)):,.2f}",
            f"${float(t.get('new_balance', 0)):,.2f}",
            (t.get('status') or '').title(),
        ])

    if len(data) == 1:
        data.append(['', '', 'No transactions in this period', '', '', '', ''])

    tbl = Table(data, colWidths=[1.0*inch, 1.3*inch, 1.6*inch, 0.9*inch, 0.9*inch, 0.9*inch, 0.7*inch], repeatRows=1)
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.25, BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT]),
        ('ALIGN', (4,1), (5,-1), 'RIGHT'),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 20))
    story.append(Paragraph('This statement is system-generated and does not require a signature. Lumina Bank — a licensed financial institution.', small))

    doc.build(story)
    return buf.getvalue()


def generate_receipt_pdf(transaction: dict, user: dict, account: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            leftMargin=0.8*inch, rightMargin=0.8*inch,
                            topMargin=0.8*inch, bottomMargin=0.8*inch)
    styles = getSampleStyleSheet()
    story = []

    header = Table([[
        Paragraph('<b>LUMINA BANK</b>', ParagraphStyle('brand', fontSize=18, textColor=GOLD, fontName='Helvetica-Bold')),
        Paragraph('<b>Transaction Receipt</b>',
                  ParagraphStyle('r', alignment=2, fontSize=13, textColor=colors.white))
    ]], colWidths=[3.5*inch, 3.2*inch])
    header.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), NAVY),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 16),
        ('RIGHTPADDING', (0,0), (-1,-1), 16),
        ('TOPPADDING', (0,0), (-1,-1), 14),
        ('BOTTOMPADDING', (0,0), (-1,-1), 14),
    ]))
    story.append(header)
    story.append(Spacer(1, 18))

    sign = '+' if transaction.get('direction') == 'credit' else '-'
    amt_style = ParagraphStyle('amt', fontSize=26, textColor=NAVY, alignment=1, fontName='Helvetica-Bold')
    story.append(Paragraph(f"{sign}${float(transaction.get('amount', 0)):,.2f}", amt_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"<font color='grey' size='10'>{(transaction.get('status') or '').upper()}</font>",
                           ParagraphStyle('st', alignment=1)))
    story.append(Spacer(1, 20))

    rows = [
        ['Reference', transaction.get('reference', '')],
        ['Date', transaction.get('created_at', '')[:19].replace('T', ' ')],
        ['Type', (transaction.get('type') or '').replace('_', ' ').title()],
        ['Description', transaction.get('description', '')],
        ['Counterparty', transaction.get('counterparty') or '—'],
        ['Account', account.get('account_number', '')],
        ['Account Holder', user.get('full_name', '')],
        ['Balance After', f"${float(transaction.get('new_balance', 0)):,.2f}"],
    ]
    t = Table(rows, colWidths=[2*inch, 4.7*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), LIGHT),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('TEXTCOLOR', (0,0), (0,-1), NAVY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t)
    story.append(Spacer(1, 24))
    story.append(Paragraph('Thank you for banking with Lumina.',
                           ParagraphStyle('ty', fontSize=10, textColor=colors.grey, alignment=1)))

    doc.build(story)
    return buf.getvalue()
