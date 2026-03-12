import os
import psycopg2
from dotenv import load_dotenv
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

# Load environment variables from the parent directory's .env file
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL is missing in the backend/.env file.")
    exit(1)

def fetch_teams_data():
    """Fetches and mathematically groups team members from PostgreSQL."""
    try:
        # Connect to your VPS Postgres Database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Query joins teams and users, capturing user information and their leadership status
        # and aggregating them clearly.
        query = """
            SELECT t.team_name, u.full_name, u.email, u.is_leader
            FROM public.team t
            JOIN public.users u ON t.id = u.team_id
            ORDER BY t.team_name, u.is_leader DESC, u.full_name;
        """
        cur.execute(query)
        rows = cur.fetchall()

        cur.close()
        conn.close()

        # Organize Data: { "Team Alpha": [ ("Alice (Leader)", "alice@mail.com"), ... ] }
        teams_dict = {}
        for team_name, full_name, email, is_leader in rows:
            if team_name not in teams_dict:
                teams_dict[team_name] = []
            
            # Format the name visually
            name_label = f"{full_name} 👑 (Leader)" if is_leader else full_name
            teams_dict[team_name].append([name_label, email])

        return teams_dict

    except Exception as e:
        print(f"Database Connection Error: {e}")
        exit(1)

def generate_pdf(teams_data, output_filename="Teams_Report.pdf"):
    """Generates a highly-formatted PDF report from the dictionary data."""
    pdf = SimpleDocTemplate(output_filename, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    
    # Custom Title Style
    title_style = ParagraphStyle(
        name="MainTitle",
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#3b0b6d"),
        spaceAfter=20,
        alignment=1 # Center alignment
    )

    elements.append(Paragraph("MathX National Level Quiz - Team Roster", title_style))
    elements.append(Spacer(1, 10))

    if not teams_data:
        elements.append(Paragraph("No team data found in the database.", styles['Normal']))
        pdf.build(elements)
        print(f"Generated {output_filename} (Empty)")
        return

    # Create robust tables for each team
    for team_name, members in teams_data.items():
        # Team Header
        team_title = f"<b>Team: {team_name}</b>"
        elements.append(Paragraph(team_title, styles['Heading2']))
        elements.append(Spacer(1, 8))

        # Table Setup
        data = [["Participant Name / Role", "Email Address"]] # Headers
        data.extend(members)

        # Style the table
        table = Table(data, colWidths=[250, 200])
        style = TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#22d3ee")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 12),
            ('BOTTOMPADDING', (0,0), (-1,0), 10),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#f8fafc")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ])
        
        table.setStyle(style)
        elements.append(table)
        elements.append(Spacer(1, 20)) # Space between teams

    try:
        pdf.build(elements)
        print(f"Successfully generated {output_filename}")
        print(f"Processed {len(teams_data)} teams.")
    except Exception as e:
        print(f"Error generating PDF: {e}")

if __name__ == "__main__":
    print("Fetching team data from VPS PostgreSQL...")
    data = fetch_teams_data()
    print("Formatting team data and writing to PDF...")
    
    output_path = os.path.join(os.path.dirname(__file__), "Teams_Report.pdf")
    generate_pdf(data, output_path)
