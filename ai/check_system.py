import sys
sys.stdout.reconfigure(encoding='utf-8')
import urllib.request
import json

def post(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode('utf-8'))

def get(url):
    with urllib.request.urlopen(url, timeout=10) as resp:
        return json.loads(resp.read().decode('utf-8'))

print("=" * 70)
print("       ZERDE 109: FULL SYSTEM END-TO-END HEALTH CHECK         ")
print("=" * 70)

# 1. Module 1: Smart Routing & Classification (KZ & RU)
c_kz = post('http://127.0.0.1:8000/api/v1/classify', {'text': 'Тұтас ауданда жарық сөніп қалды, электр қуаты мүлдем жоқ, сымдар үзілген!'})
print(f"1. [Module 1] Kazakh Emergency Appeal:")
print(f"   - Category:  {c_kz['category_code']} ({c_kz['category']})")
print(f"   - Priority:  {c_kz['priority']}")
print(f"   - Service:   {c_kz['responsible_org']}")
print(f"   - Speed:     {c_kz['execution_time_seconds']}s | Source: {c_kz['source']}")
print(f"   - Verified:  {c_kz['verified']}")

c_ru = post('http://127.0.0.1:8000/api/v1/classify', {'text': 'В квартире ледяные батареи, нет отопления уже двое суток, замерзаем'})
print(f"\n2. [Module 1] Russian Heating Appeal:")
print(f"   - Category:  {c_ru['category_code']} ({c_ru['category']})")
print(f"   - Priority:  {c_ru['priority']}")
print(f"   - Service:   {c_ru['responsible_org']}")
print(f"   - Speed:     {c_ru['execution_time_seconds']}s | Source: {c_ru['source']}")
print(f"   - Verified:  {c_ru['verified']}")

# 2. Module 2: Operator Assistant (Similar, Duplicates, Suggestion)
sim = post('http://127.0.0.1:8000/api/v1/similar', {'text': 'ледяные батареи нет тепла в квартире', 'top_k': 3})
print(f"\n3. [Module 2] Semantic Vector Search (zerde-embedding-109):")
print(f"   - Similar appeals found: {len(sim['similar_appeals'])}")
print(f"   - Top match similarity:  {sim['similar_appeals'][0]['score']}")
print(f"   - Matched historical:   {sim['similar_appeals'][0]['text'][:70]}...")

dup = post('http://127.0.0.1:8000/api/v1/duplicates', {'text': 'ледяные батареи нет тепла в квартире', 'threshold': 0.85})
print(f"\n4. [Module 2] Duplicate Detection:")
print(f"   - Is duplicate:   {dup['is_duplicate']} (confidence: {dup['confidence_score']})")
print(f"   - Matched cases:  {len(dup['matched_appeals'])}")

suggest = post('http://127.0.0.1:8000/api/v1/operator/suggest', {'appeal_text': 'В квартире нет тепла, батареи холодные', 'category': 'HEATING'})
print(f"\n5. [Module 2] Operator Prompt & Reply Suggestion:")
print(f"   - Assigned:       {suggest['assigned_service']} (SLA: {suggest['sla_hours']} ч.)")
print(f"   - Suggestion (KZ): {suggest['suggested_reply_kk'][:65]}...")
print(f"   - Suggestion (RU): {suggest['suggested_reply_ru'][:65]}...")

# 3. Module 3: Executive Situational Center
spikes = get('http://127.0.0.1:8000/api/v1/analytics/spikes')
print(f"\n6. [Module 3] Anomaly & Spike Detector (Z-score):")
print(f"   - Active communal spikes detected: {len(spikes)}")
if len(spikes) > 0:
    sp0 = spikes[0]
    print(f"   - Top alert: {sp0['severity']} in {sp0['region']} ({sp0['category']}) | z={sp0['z_score']}")

fc = get('http://127.0.0.1:8000/api/v1/analytics/forecast')
print(f"\n7. [Module 3] Workload Forecast & Erlang-C Staffing:")
print(f"   - 60-day predicted appeals: {fc['total_predicted_appeals']:,}")
print(f"   - Average daily appeals:    {fc['avg_daily_appeals']:,}")
print(f"   - Recommended operators:    {fc['recommended_total_operators']} per shift")

nl = post('http://127.0.0.1:8000/api/v1/analytics/query', {'question': 'Қарағанды бойынша су мәселелері қанша?'})
print(f"\n8. [Module 3] Natural Language Executive Query (KZ):")
print(f"   - Question: {nl['question']}")
print(f"   - Answer:   {nl['answer']}")
print(f"   - Chart:    {nl['chart_type']} | Metric: {nl['metric_type']}")

# 4. Frontend Bridge Meta
meta = get('http://127.0.0.1:8000/api/meta')
print(f"\n9. [Frontend Bridge] Compatibility with @zerde/web:")
print(f"   - Regions: {len(meta['regions'])} | Themes: {len(meta['themes'])} | Services: {len(meta['services'])}")

print("=" * 70)
print("          ALL SYSTEMS FULLY OPERATIONAL (HEALTH: 100%)          ")
print("=" * 70)
