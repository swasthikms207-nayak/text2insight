import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from ..models import ChartSpec, InsightReport
from .executor import clean_for_json

def generate_chart_spec(df: pd.DataFrame, question: str) -> ChartSpec:
    """Intelligently detects the best chart configuration based on result shape and types."""
    if df is None or df.empty or len(df.columns) < 1:
        return ChartSpec(
            recommended=False,
            chart_type="bar",
            title="No Data to Visualize",
            data=[]
        )

    # Convert Series to DataFrame
    if isinstance(df, pd.Series):
        df = df.to_frame()

    # Reset non-standard index
    if not isinstance(df.index, pd.RangeIndex):
        df = df.reset_index()

    cols = list(df.columns)
    num_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
    cat_cols = [c for c in cols if not pd.api.types.is_numeric_dtype(df[c])]

    chart_type = "bar"
    x_key = None
    y_keys = []
    title = question.strip().rstrip("?").capitalize()

    # Logic for selecting chart dimensions
    if len(cat_cols) >= 1 and len(num_cols) >= 1:
        x_key = str(cat_cols[0])
        # Check if date-like
        is_date = "date" in x_key.lower() or "time" in x_key.lower() or "month" in x_key.lower() or "year" in x_key.lower() or "quarter" in x_key.lower()
        if is_date:
            chart_type = "line" if len(df) > 4 else "bar"
        elif len(df) <= 6 and len(num_cols) == 1 and "share" in question.lower() or "distribution" in question.lower() or "proportion" in question.lower():
            chart_type = "pie"
        else:
            chart_type = "bar"
        y_keys = [str(c) for c in num_cols[:3]]  # Up to 3 metrics

    elif len(num_cols) >= 2:
        if len(df) > 15:
            chart_type = "scatter"
            x_key = str(num_cols[0])
            y_keys = [str(num_cols[1])]
        else:
            chart_type = "bar"
            x_key = str(num_cols[0])
            y_keys = [str(num_cols[1])]

    elif len(num_cols) == 1 and len(cat_cols) == 0:
        # Single metric summary
        chart_type = "bar"
        x_key = "Metric"
        y_keys = [str(num_cols[0])]
        df = df.copy()
        df["Metric"] = "Total"

    elif len(cat_cols) >= 1 and len(num_cols) == 0:
        # Categorical only -> count frequency
        freq = df[cat_cols[0]].value_counts().reset_index()
        freq.columns = [cat_cols[0], "count"]
        return generate_chart_spec(freq, question)

    else:
        x_key = str(cols[0])
        y_keys = [str(cols[1])] if len(cols) > 1 else [str(cols[0])]

    # Format chart data points (limit to top 30 for clear visualization)
    chart_df = df.head(30).copy()
    chart_data = []
    for _, row in chart_df.iterrows():
        point = {str(k): clean_for_json(v) for k, v in row.items()}
        chart_data.append(point)

    labels = {k: k.replace("_", " ").title() for k in ([x_key] + y_keys) if k}

    return ChartSpec(
        recommended=True,
        chart_type=chart_type,
        title=title or "Data Visualization",
        x_key=x_key,
        y_keys=y_keys,
        labels=labels,
        data=chart_data,
        description=f"{chart_type.capitalize()} chart comparing {', '.join(labels.get(y, y) for y in y_keys)} across {labels.get(x_key, x_key or 'categories')}."
    )


def generate_insights(df: pd.DataFrame, question: str) -> InsightReport:
    """Generates structured short insights and high-level analytical highlights."""
    if df is None or df.empty:
        return InsightReport(
            headline="No records found",
            summary="The executed query returned zero matching rows. Check filter conditions or dataset parameters.",
            key_metrics=[],
            takeaways=["Verify that column names match the schema.", "Consider relaxing filter conditions."]
        )

    # Convert Series to DataFrame
    if isinstance(df, pd.Series):
        df = df.to_frame()
    if not isinstance(df.index, pd.RangeIndex):
        df = df.reset_index()

    total_rows = len(df)
    cols = list(df.columns)
    num_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
    cat_cols = [c for c in cols if not pd.api.types.is_numeric_dtype(df[c])]

    key_metrics = []
    takeaways = []

    # If single row / aggregate result
    if total_rows == 1:
        row = df.iloc[0]
        headline_parts = []
        for col in cols[:3]:
            val = row[col]
            if isinstance(val, (int, float, np.number)):
                val_str = f"{val:,.2f}" if isinstance(val, float) else f"{val:,}"
            else:
                val_str = str(val)
            key_metrics.append({
                "label": col.replace("_", " ").title(),
                "value": val_str,
                "badge": "Calculated Metric"
            })
            headline_parts.append(f"{col.replace('_', ' ').title()}: {val_str}")
        
        headline = " | ".join(headline_parts)
        summary = f"Summary calculation completed across the dataset answering '{question}'."
        takeaways = [
            f"The computed figure reflects the active filter and aggregation parameters.",
            f"Result based on 1 aggregated row returned."
        ]
        return InsightReport(headline=headline, summary=summary, key_metrics=key_metrics, takeaways=takeaways)

    # Multi-row result: analyze top values, averages, and distribution
    if num_cols:
        primary_metric = num_cols[0]
        total_val = df[primary_metric].sum()
        mean_val = df[primary_metric].mean()
        max_idx = df[primary_metric].idxmax()
        min_idx = df[primary_metric].idxmin()
        max_val = df.loc[max_idx, primary_metric]
        min_val = df.loc[min_idx, primary_metric]

        name_col = cat_cols[0] if cat_cols else None
        top_name = str(df.loc[max_idx, name_col]) if name_col else f"Row #{max_idx + 1}"
        low_name = str(df.loc[min_idx, name_col]) if name_col else f"Row #{min_idx + 1}"

        # Format numbers
        fmt_total = f"{total_val:,.2f}" if isinstance(total_val, float) else f"{total_val:,}"
        fmt_avg = f"{mean_val:,.2f}"
        fmt_max = f"{max_val:,.2f}" if isinstance(max_val, float) else f"{max_val:,}"

        metric_label = primary_metric.replace("_", " ").title()

        key_metrics.append({
            "label": f"Top Performer ({metric_label})",
            "value": f"{top_name} ({fmt_max})",
            "badge": "Leader"
        })
        key_metrics.append({
            "label": f"Average {metric_label}",
            "value": fmt_avg,
            "badge": "Mean"
        })
        key_metrics.append({
            "label": f"Total {metric_label}",
            "value": fmt_total,
            "badge": f"{total_rows} entries"
        })

        pct_top = round((max_val / total_val * 100), 1) if total_val else 0
        headline = f"{top_name} leads with {fmt_max} ({pct_top}% of total {metric_label})"
        summary = (
            f"Analysis of {total_rows} records shows a significant variance in {metric_label}. "
            f"The highest value was recorded by {top_name} ({fmt_max}), while {low_name} recorded the lowest ({min_val})."
        )
        takeaways.append(f"{top_name} represents the primary contributor for {metric_label}.")
        takeaways.append(f"Average {metric_label} stands at {fmt_avg} across all {total_rows} evaluated items.")
        if total_rows > 3:
            top_3_sum = df.nlargest(3, primary_metric)[primary_metric].sum()
            top_3_pct = round((top_3_sum / total_val * 100), 1) if total_val else 0
            takeaways.append(f"Top 3 entries account for {top_3_pct}% of cumulative {metric_label}.")
    else:
        # Categorical only
        headline = f"Identified {total_rows} matching categories"
        summary = f"Query executed successfully returning {total_rows} unique records."
        key_metrics.append({
            "label": "Total Categories",
            "value": str(total_rows),
            "badge": "Distinct"
        })
        takeaways.append(f"Retrieved {len(cols)} distinct dimensions.")

    return InsightReport(
        headline=headline,
        summary=summary,
        key_metrics=key_metrics,
        takeaways=takeaways
    )
