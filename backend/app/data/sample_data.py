import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def get_sample_saas_data() -> pd.DataFrame:
    np.random.seed(42)
    companies = [
        "Acme Corp", "ByteWave", "NovaTech", "HyperScale", "OmniCloud",
        "Zenith Labs", "AlphaPeak", "QuantumShift", "BlueSky AI", "Vortex Digital",
        "Starlight Media", "EchoWorks", "Pinnacle Ops", "Solaris Health", "Apex Retail",
        "CyberShield", "Nexus Global", "TerraData", "Beacon Logistics", "Aura Creative",
        "Vector Flow", "Pulse Analytics", "CoreLogic Inc", "Horizon Soft", "Matrix Group"
    ]
    plans = ["Starter", "Growth", "Enterprise"]
    countries = ["United States", "United Kingdom", "Germany", "Canada", "Australia", "France", "Japan"]
    
    rows = []
    base_date = datetime(2024, 1, 1)
    
    for i in range(120):
        comp = companies[i % len(companies)] if i < len(companies) else f"{companies[i % len(companies)]} Sub-{i//len(companies)}"
        plan = np.random.choice(plans, p=[0.4, 0.35, 0.25])
        country = np.random.choice(countries)
        
        if plan == "Starter":
            spend = round(np.random.uniform(49, 199), 2)
            tickets = np.random.randint(1, 12)
        elif plan == "Growth":
            spend = round(np.random.uniform(299, 999), 2)
            tickets = np.random.randint(0, 8)
        else:
            spend = round(np.random.uniform(1500, 4800), 2)
            tickets = np.random.randint(0, 5)
            
        signup = base_date + timedelta(days=int(np.random.randint(0, 500)))
        churn_prob = 0.35 if plan == "Starter" else (0.18 if plan == "Growth" else 0.08)
        is_churned = bool(np.random.random() < churn_prob)
        usage_score = round(np.random.uniform(40, 100) if not is_churned else np.random.uniform(10, 60), 1)
        nps = int(np.random.randint(7, 11) if not is_churned else np.random.randint(1, 7))
        
        rows.append({
            "customer_id": f"CUST-{1001 + i}",
            "company_name": comp,
            "plan": plan,
            "monthly_spend": spend,
            "country": country,
            "signup_date": signup.strftime("%Y-%m-%d"),
            "is_churned": "Yes" if is_churned else "No",
            "feature_usage_score": usage_score,
            "nps_score": nps,
            "support_tickets": tickets
        })
    return pd.DataFrame(rows)


def get_sample_ecommerce_data() -> pd.DataFrame:
    np.random.seed(101)
    categories = ["Electronics", "Apparel", "Home & Kitchen", "Fitness", "Books"]
    category_products = {
        "Electronics": ["Noise-Canceling Headphones", "Wireless Mechanical Keyboard", "Ultra-HD 4K Webcam", "Smart Fitness Watch", "Portable Power Station"],
        "Apparel": ["Merino Wool Hoodie", "Waterproof Trail Jacket", "Performance Running Tee", "Everyday Chino Pants", "Merino Crew Socks (3-Pack)"],
        "Home & Kitchen": ["Smart Espresso Machine", "Cast Iron Dutch Oven", "Air Purifier Pro", "Robot Vacuum Cleaner", "Stainless Steel Chef Knife"],
        "Fitness": ["Adjustable Dumbbell Set", "High-Density Yoga Mat", "Resistance Bands Pro", "Speed Jump Rope", "Foam Muscle Roller"],
        "Books": ["Designing Data Systems", "Python Data Science Handbook", "Clean Architecture", "The Lean Startup", "Deep Learning Foundations"]
    }
    regions = ["North America", "Europe", "Asia Pacific", "Latin America"]
    payment_methods = ["Credit Card", "PayPal", "Apple Pay", "Wire Transfer"]
    
    rows = []
    base_date = datetime(2024, 1, 1)
    
    for i in range(160):
        cat = np.random.choice(categories)
        prod = np.random.choice(category_products[cat])
        region = np.random.choice(regions, p=[0.45, 0.30, 0.15, 0.10])
        payment = np.random.choice(payment_methods)
        
        if cat == "Electronics":
            price = round(np.random.uniform(79, 399), 2)
            qty = np.random.randint(1, 4)
        elif cat == "Home & Kitchen":
            price = round(np.random.uniform(49, 249), 2)
            qty = np.random.randint(1, 3)
        elif cat == "Apparel":
            price = round(np.random.uniform(29, 129), 2)
            qty = np.random.randint(1, 6)
        elif cat == "Fitness":
            price = round(np.random.uniform(25, 180), 2)
            qty = np.random.randint(1, 5)
        else:
            price = round(np.random.uniform(19, 59), 2)
            qty = np.random.randint(1, 8)
            
        order_date = base_date + timedelta(days=int(np.random.randint(0, 365)))
        delivery_days = int(np.random.choice([2, 3, 4, 5, 7, 9], p=[0.25, 0.35, 0.20, 0.10, 0.07, 0.03]))
        revenue = round(price * qty, 2)
        
        rows.append({
            "order_id": f"ORD-{20000 + i}",
            "order_date": order_date.strftime("%Y-%m-%d"),
            "category": cat,
            "product_name": prod,
            "units_sold": qty,
            "unit_price": price,
            "total_revenue": revenue,
            "customer_region": region,
            "payment_method": payment,
            "delivery_days": delivery_days
        })
    return pd.DataFrame(rows)


def get_sample_tech_financials() -> pd.DataFrame:
    rows = [
        {"company": "Alphabet", "ticker": "GOOGL", "sector": "Cloud & AI", "quarter": "Q1 2024", "revenue_billions": 80.5, "net_income_billions": 23.7, "rd_spend_billions": 11.2, "gross_margin_pct": 57.5, "pe_ratio": 24.8},
        {"company": "Alphabet", "ticker": "GOOGL", "sector": "Cloud & AI", "quarter": "Q2 2024", "revenue_billions": 84.7, "net_income_billions": 25.2, "rd_spend_billions": 11.8, "gross_margin_pct": 58.1, "pe_ratio": 25.2},
        {"company": "Alphabet", "ticker": "GOOGL", "sector": "Cloud & AI", "quarter": "Q3 2024", "revenue_billions": 88.3, "net_income_billions": 26.3, "rd_spend_billions": 12.4, "gross_margin_pct": 58.6, "pe_ratio": 24.1},
        {"company": "Microsoft", "ticker": "MSFT", "sector": "Enterprise Software", "quarter": "Q1 2024", "revenue_billions": 61.9, "net_income_billions": 21.9, "rd_spend_billions": 7.2, "gross_margin_pct": 70.1, "pe_ratio": 34.5},
        {"company": "Microsoft", "ticker": "MSFT", "sector": "Enterprise Software", "quarter": "Q2 2024", "revenue_billions": 64.7, "net_income_billions": 22.0, "rd_spend_billions": 7.5, "gross_margin_pct": 69.8, "pe_ratio": 35.1},
        {"company": "Microsoft", "ticker": "MSFT", "sector": "Enterprise Software", "quarter": "Q3 2024", "revenue_billions": 65.6, "net_income_billions": 24.7, "rd_spend_billions": 7.8, "gross_margin_pct": 70.4, "pe_ratio": 33.8},
        {"company": "Apple", "ticker": "AAPL", "sector": "Hardware & Ecosystem", "quarter": "Q1 2024", "revenue_billions": 90.8, "net_income_billions": 23.6, "rd_spend_billions": 7.9, "gross_margin_pct": 46.6, "pe_ratio": 32.0},
        {"company": "Apple", "ticker": "AAPL", "sector": "Hardware & Ecosystem", "quarter": "Q2 2024", "revenue_billions": 85.8, "net_income_billions": 21.4, "rd_spend_billions": 8.0, "gross_margin_pct": 46.3, "pe_ratio": 33.2},
        {"company": "Apple", "ticker": "AAPL", "sector": "Hardware & Ecosystem", "quarter": "Q3 2024", "revenue_billions": 94.9, "net_income_billions": 24.9, "rd_spend_billions": 8.2, "gross_margin_pct": 46.8, "pe_ratio": 31.5},
        {"company": "Nvidia", "ticker": "NVDA", "sector": "Semiconductors & AI", "quarter": "Q1 2024", "revenue_billions": 26.0, "net_income_billions": 14.9, "rd_spend_billions": 2.7, "gross_margin_pct": 78.4, "pe_ratio": 62.4},
        {"company": "Nvidia", "ticker": "NVDA", "sector": "Semiconductors & AI", "quarter": "Q2 2024", "revenue_billions": 30.0, "net_income_billions": 16.6, "rd_spend_billions": 3.1, "gross_margin_pct": 75.1, "pe_ratio": 58.7},
        {"company": "Nvidia", "ticker": "NVDA", "sector": "Semiconductors & AI", "quarter": "Q3 2024", "revenue_billions": 35.1, "net_income_billions": 19.3, "rd_spend_billions": 3.4, "gross_margin_pct": 74.6, "pe_ratio": 52.3},
        {"company": "Amazon", "ticker": "AMZN", "sector": "Cloud & E-Commerce", "quarter": "Q1 2024", "revenue_billions": 143.3, "net_income_billions": 10.4, "rd_spend_billions": 21.5, "gross_margin_pct": 49.3, "pe_ratio": 41.2},
        {"company": "Amazon", "ticker": "AMZN", "sector": "Cloud & E-Commerce", "quarter": "Q2 2024", "revenue_billions": 148.0, "net_income_billions": 13.5, "rd_spend_billions": 22.1, "gross_margin_pct": 49.9, "pe_ratio": 39.8},
        {"company": "Amazon", "ticker": "AMZN", "sector": "Cloud & E-Commerce", "quarter": "Q3 2024", "revenue_billions": 158.9, "net_income_billions": 15.3, "rd_spend_billions": 22.8, "gross_margin_pct": 50.2, "pe_ratio": 38.4}
    ]
    return pd.DataFrame(rows)
