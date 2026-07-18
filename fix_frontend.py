import glob

replacements = {
    'p.p_id.slice(0, 8)': 'p.p_id',
    'inv.id.toString().slice(0, 8).toUpperCase()': 'inv.id',
    'addingServiceInvoice.id.toString().slice(0,8).toUpperCase()': 'addingServiceInvoice.id',
    'sale.id?.slice(0, 8).toUpperCase()': 'sale.id',
    'sale.id.slice(0,8).toUpperCase()': 'sale.id',
    'returnSaleData.id.slice(0, 8).toUpperCase()': 'returnSaleData.id',
    'sale.id.slice(0, 8).toUpperCase()': 'sale.id',
    'selectedVisit.id.slice(0, 8)': 'selectedVisit.id',
    'printCharge.lc_id.toString().slice(0, 8)': 'printCharge.lc_id',
    'String(selectedVisit.v_id || selectedVisit.id).slice(0, 8)': '(selectedVisit.v_id || selectedVisit.id)',
    '(visit.v_id || visit.id)?.slice(0, 8)': '(visit.v_id || visit.id)',
    'visit.v_id?.slice(0, 8)': 'visit.v_id',
    '(visit.id || "").toString().slice(0, 6)': '(visit.id || "")',
    'invoice.id?.toString().slice(0, 8).toUpperCase()': 'invoice.id',
    'formData.id.slice(0, 8)': 'formData.id',
    'formData.id.slice(0, 8).toUpperCase()': 'formData.id'
}

files = glob.glob('frontend/src/pages/*.jsx')
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    modified = False
    for old, new in replacements.items():
        if old in content:
            content = content.replace(old, new)
            modified = True
            
    if modified:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
