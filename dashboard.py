"""
Professional Helpdesk Ticket Management System Dashboard.
Matches design: KPI cards, donut chart, bar charts.
"""
import streamlit as st
import plotly.graph_objects as go
from tickets import get_dashboard_stats, get_tickets

# Color palette from dashboard design (blue theme)
PRIMARY_BLUE = "#3f51b5"
HEADER_BG = "#3f51b5"
CARD_BORDER = "#e0e0e0"
CHART_COLORS = ["#1e3a5f", "#3f51b5", "#5c6bc0", "#9fa8da"]


def _kpi_card(title: str, value: int, key: str):
    """Render a KPI card with blue header bar."""
    st.markdown(f"""
        <div class="dashboard-kpi-card" id="kpi-{key}">
            <div class="dashboard-kpi-header">{title}</div>
            <div class="dashboard-kpi-value">{value}</div>
        </div>
    """, unsafe_allow_html=True)


def _chart_panel(title: str, content_fn, key: str):
    """Render a chart panel with blue header."""
    st.markdown(f"""
        <div class="dashboard-chart-panel-wrapper">
            <div class="dashboard-chart-header">{title}</div>
        </div>
    """, unsafe_allow_html=True)
    with st.container():
        content_fn()


def render_dashboard():
    """Render the full professional dashboard."""
    stats = get_dashboard_stats()

    # Inject dashboard-specific CSS (white theme matching reference design)
    st.markdown("""
        <style>
        /* Dashboard: full width, white background */
        .main .block-container { max-width: 100% !important; padding-left: 2rem !important; padding-right: 2rem !important; }
        [data-testid="stAppViewContainer"], .main, .main .block-container { background-color: #ffffff !important; }
        
        .dashboard-header {
            font-size: 1.6rem;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 0.5rem;
        }
        .dashboard-subtitle {
            font-size: 0.95rem;
            color: #6b7280;
            margin-bottom: 1.5rem;
        }
        .dashboard-kpi-card {
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .dashboard-kpi-header {
            background: #3f51b5;
            color: white;
            padding: 10px 14px;
            font-size: 0.9rem;
            font-weight: 500;
        }
        .dashboard-kpi-value {
            padding: 20px 14px;
            font-size: 2rem;
            font-weight: 700;
            color: #2d3748;
            text-align: center;
        }
        .dashboard-chart-panel-wrapper {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .dashboard-chart-header {
            background: #3f51b5;
            color: white;
            padding: 10px 14px;
            font-size: 0.9rem;
            font-weight: 500;
        }
        .dashboard-chart-body {
            background: #ffffff;
            padding: 12px;
        }
        </style>
    """, unsafe_allow_html=True)

    # Header
    st.markdown("""
        <div class="dashboard-header">Helpdesk Ticket Management System Dashboard</div>
        <div class="dashboard-subtitle">
            This dashboard illustrates facts and figures related to ticket management. 
            It includes overdue tasks, tickets due today, open tickets, tickets on hold, unassigned tickets, and more.
        </div>
    """, unsafe_allow_html=True)

    # KPI Cards row (6 cards)
    kpis = [
        ("Overdue Tasks", stats["overdue"], "overdue"),
        ("Tickets Due Today", stats["due_today"], "due_today"),
        ("Open Tickets", stats["open"], "open"),
        ("Tickets on Hold", stats["on_hold"], "on_hold"),
        ("Unassigned Tickets", stats["unassigned"], "unassigned"),
        ("All Tickets", stats["all"], "all"),
    ]

    cols = st.columns(6)
    for i, (title, value, key) in enumerate(kpis):
        with cols[i]:
            _kpi_card(title, value, key)

    st.markdown("<br>", unsafe_allow_html=True)

    # Charts row (3 panels)
    col1, col2, col3 = st.columns(3)

    with col1:
        _chart_panel("Unresolved Tickets by Priority", lambda: _donut_chart(stats["by_priority"]), "priority")

    with col2:
        _chart_panel("Unresolved Tickets by Status", lambda: _status_bar_chart(stats["by_status"]), "status")

    with col3:
        _chart_panel("New & Open Tickets Category-wise", lambda: _category_bar_chart(stats["by_category"]), "category")

    st.markdown("<br>", unsafe_allow_html=True)

    # Ticket list (existing functionality)
    st.divider()
    st.markdown("### Ticket list")
    all_tickets = get_tickets(limit=100)
    if not all_tickets:
        st.info("No tickets have been raised yet.")
    else:
        for t in all_tickets:
            with st.expander(f"**{t['id']}** — {t['subject']} ({t.get('priority', 'Medium')})", expanded=False):
                st.markdown(f"**Subject:** {t['subject']}")
                st.markdown(f"**Description:** {t['description']}")
                st.markdown(f"**Priority:** {t.get('priority', 'Medium')} | **Status:** {t.get('status', 'Open')}")
                st.caption(f"Created: {t.get('created_at', '')[:19].replace('T', ' ')}")

    st.caption("Data updates automatically from ticket storage.")


def _donut_chart(by_priority: dict):
    """Donut chart for unresolved tickets by priority."""
    labels = list(by_priority.keys())
    values = list(by_priority.values())
    total = sum(values)

    fig = go.Figure(data=[go.Pie(
        labels=labels,
        values=values,
        hole=0.6,
        marker_colors=CHART_COLORS[: len(labels)],
        textinfo="percent",
        textposition="outside",
        hovertemplate="%{label}: %{value} (%{percent})<extra></extra>",
    )])
    fig.update_layout(
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=-0.2),
        margin=dict(t=20, b=20, l=20, r=20),
        height=280,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        annotations=[dict(text=str(total), x=0.5, y=0.5, font_size=24, showarrow=False)],
    )
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})


def _status_bar_chart(by_status: dict):
    """Horizontal bar chart for tickets by status."""
    labels = ["Open", "Pending", "Resolved", "Closed"]
    values = [by_status.get(l, 0) for l in labels]
    colors = [CHART_COLORS[0], CHART_COLORS[1], "#e0e0e0", "#e0e0e0"]

    fig = go.Figure(
        go.Bar(
            y=labels,
            x=values,
            orientation="h",
            marker_color=colors,
            text=values,
            textposition="outside",
        )
    )
    max_val = max(values) or 1
    fig.update_layout(
        margin=dict(t=20, b=20, l=20, r=40),
        height=200,
        xaxis=dict(range=[0, max_val * 1.2], showgrid=False, zeroline=False),
        yaxis=dict(autorange="reversed", showgrid=False),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        showlegend=False,
    )
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})


def _category_bar_chart(by_category: dict):
    """Horizontal bar chart for tickets by category."""
    labels = list(by_category.keys())
    values = list(by_category.values())
    colors = (CHART_COLORS * (len(labels) // 4 + 1))[: len(labels)]

    fig = go.Figure(
        go.Bar(
            y=labels,
            x=values,
            orientation="h",
            marker_color=colors,
            text=values,
            textposition="outside",
        )
    )
    max_val = max(values) if values else 1
    fig.update_layout(
        margin=dict(t=20, b=20, l=20, r=40),
        height=200,
        xaxis=dict(range=[0, max_val * 1.2], showgrid=False, zeroline=False),
        yaxis=dict(autorange="reversed", showgrid=False),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        showlegend=False,
    )
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
