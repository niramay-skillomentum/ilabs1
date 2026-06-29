"""Generate a one-page cut-out worksheet: wild animals and their homes."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ASSETS = Path(
    r"C:\Users\niram\.cursor\projects\c-Users-niram-Downloads-ilabs-v7-ilabs-v7-ilabs-v6\assets"
)
OUTPUT = Path(__file__).parent / "wild_animals_and_homes.pdf"

ROWS = [
    {
        "animal": "lion.png",
        "home": "lion_den.png",
        "text": "Lion lives in the den.",
    },
    {
        "animal": "bird.png",
        "home": "bird_nest.png",
        "text": "Bird lives in the nest.",
    },
    {
        "animal": "bear.png",
        "home": "bear_cave.png",
        "text": "Bear lives in the cave.",
    },
    {
        "animal": "rabbit.png",
        "home": "rabbit_burrow.png",
        "text": "Rabbit lives in the burrow.",
    },
    {
        "animal": "bee.png",
        "home": "bee_hive.png",
        "text": "Bee lives in the hive.",
    },
]


def draw_dashed_rect(c, x, y, w, h, dash=(3, 3)):
    c.saveState()
    c.setDash(dash[0], dash[1])
    c.setStrokeColor(colors.HexColor("#888888"))
    c.setLineWidth(0.8)
    c.rect(x, y, w, h, stroke=1, fill=0)
    c.restoreState()


def draw_solid_rect(c, x, y, w, h):
    c.setStrokeColor(colors.HexColor("#333333"))
    c.setLineWidth(1.2)
    c.rect(x, y, w, h, stroke=1, fill=0)


def fit_image(c, path, x, y, box_w, box_h, padding=3 * mm):
    img = ImageReader(str(path))
    iw, ih = img.getSize()
    inner_w = box_w - 2 * padding
    inner_h = box_h - 2 * padding
    scale = min(inner_w / iw, inner_h / ih)
    draw_w = iw * scale
    draw_h = ih * scale
    draw_x = x + (box_w - draw_w) / 2
    draw_y = y + (box_h - draw_h) / 2
    c.drawImage(img, draw_x, draw_y, draw_w, draw_h, mask="auto")


def main():
    page_w, page_h = A4
    margin = 8 * mm
    c = canvas.Canvas(str(OUTPUT), pagesize=A4)

    title_h = 14 * mm
    footer_h = 8 * mm
    content_top = page_h - margin - title_h
    content_bottom = margin + footer_h
    content_h = content_top - content_bottom
    row_gap = 2 * mm
    row_h = (content_h - row_gap * (len(ROWS) - 1)) / len(ROWS)

    img_w = 38 * mm
    text_w = page_w - 2 * margin - 2 * img_w - 4 * mm
    strip_w = page_w - 2 * margin

    # Title
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(colors.HexColor("#1a5276"))
    c.drawCentredString(page_w / 2, page_h - margin - 10 * mm, "Wild Animals and Their Homes")
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#555555"))
    c.drawCentredString(
        page_w / 2,
        page_h - margin - title_h + 2 * mm,
        "Cut along the dashed lines. Match each animal with its home.",
    )

    for i, row in enumerate(ROWS):
        y = content_top - (i + 1) * row_h - i * row_gap
        x = margin

        draw_dashed_rect(c, x, y, strip_w, row_h)

        animal_x = x + 2 * mm
        home_x = animal_x + img_w + 2 * mm
        text_x = home_x + img_w + 4 * mm

        draw_solid_rect(c, animal_x, y + 2 * mm, img_w, row_h - 4 * mm)
        draw_solid_rect(c, home_x, y + 2 * mm, img_w, row_h - 4 * mm)

        fit_image(c, ASSETS / row["animal"], animal_x, y + 2 * mm, img_w, row_h - 4 * mm)
        fit_image(c, ASSETS / row["home"], home_x, y + 2 * mm, img_w, row_h - 4 * mm)

        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.black)
        text_y = y + row_h / 2 - 2 * mm
        c.drawString(text_x, text_y, row["text"])

        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#777777"))
        c.drawString(animal_x + 2 * mm, y + 3 * mm, "Animal")
        c.drawString(home_x + 2 * mm, y + 3 * mm, "Home")

    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(colors.HexColor("#888888"))
    c.drawCentredString(
        page_w / 2,
        margin + 2 * mm,
        "Tip: Cut each row into 3 pieces (animal, home, sentence) and paste them together.",
    )

    c.showPage()
    c.save()
    print(f"Created: {OUTPUT}")


if __name__ == "__main__":
    main()
