from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import json

app = Flask(__name__)
CORS(app)

DB_FILE = 'database.db'

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Members table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        firstName TEXT,
        lastName TEXT,
        birthDate TEXT,
        profession TEXT,
        tcId TEXT,
        phone TEXT,
        address TEXT,
        bloodType TEXT,
        diagnosisDate TEXT,
        notes TEXT
    )
    ''')
    
    # Stock table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS stock (
        id TEXT PRIMARY KEY,
        productName TEXT,
        entryDate TEXT,
        receivedQuantity REAL,
        remainingQuantity REAL,
        unit TEXT,
        expiryDate TEXT,
        donorName TEXT
    )
    ''')
    
    # Distributions table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS distributions (
        id TEXT PRIMARY KEY,
        memberId TEXT,
        distributionDate TEXT,
        receiptNumber TEXT,
        notes TEXT,
        items TEXT, -- JSON string for items
        FOREIGN KEY (memberId) REFERENCES members (id)
    )
    ''')
    
    # Financial table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS financial (
        id TEXT PRIMARY KEY,
        date TEXT,
        type TEXT,
        amount REAL,
        category TEXT,
        description TEXT,
        paymentMethod TEXT,
        dekontNumber TEXT,
        makbuzNumber TEXT
    )
    ''')
    
    # Settings table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    ''')
    
    # Default settings
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_pw', 'admin123')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('viewer_pw', 'izleyici123')")
    
    conn.commit()
    conn.close()

@app.route('/api/data', methods=['GET'])
def get_all_data():
    conn = get_db_connection()
    
    members = [dict(row) for row in conn.execute('SELECT * FROM members').fetchall()]
    stock = [dict(row) for row in conn.execute('SELECT * FROM stock').fetchall()]
    
    distributions_raw = conn.execute('SELECT * FROM distributions').fetchall()
    distributions = []
    for row in distributions_raw:
        d = dict(row)
        d['items'] = json.loads(d['items']) if d['items'] else []
        distributions.append(d)
        
    financial = [dict(row) for row in conn.execute('SELECT * FROM financial').fetchall()]
    
    conn.close()
    return jsonify({
        'members': members,
        'stock': stock,
        'distributions': distributions,
        'financial': financial
    })

@app.route('/api/save', methods=['POST'])
def save_all_data():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Simple sync: Clear and insert all
        # In a real app, we'd do incremental updates, but for this conversion, 
        # maintaining the same 'data' object structure is easier.
        
        cursor.execute('DELETE FROM members')
        for m in data.get('members', []):
            cursor.execute('''
                INSERT INTO members (id, firstName, lastName, birthDate, profession, tcId, phone, address, bloodType, diagnosisDate, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (m.get('id'), m.get('firstName'), m.get('lastName'), m.get('birthDate'), m.get('profession'), 
                  m.get('tcId'), m.get('phone'), m.get('address'), m.get('bloodType'), m.get('diagnosisDate'), m.get('notes')))
            
        cursor.execute('DELETE FROM stock')
        for s in data.get('stock', []):
            cursor.execute('''
                INSERT INTO stock (id, productName, entryDate, receivedQuantity, remainingQuantity, unit, expiryDate, donorName)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (s.get('id'), s.get('productName'), s.get('entryDate'), s.get('receivedQuantity'), 
                  s.get('remainingQuantity'), s.get('unit'), s.get('expiryDate'), s.get('donorName')))
            
        cursor.execute('DELETE FROM distributions')
        for d in data.get('distributions', []):
            cursor.execute('''
                INSERT INTO distributions (id, memberId, distributionDate, receiptNumber, notes, items)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (d.get('id'), d.get('memberId'), d.get('distributionDate'), d.get('receiptNumber'), 
                  d.get('notes'), json.dumps(d.get('items', []))))
            
        cursor.execute('DELETE FROM financial')
        for f in data.get('financial', []):
            cursor.execute('''
                INSERT INTO financial (id, date, type, amount, category, description, paymentMethod, dekontNumber, makbuzNumber)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (f.get('id'), f.get('date'), f.get('type'), f.get('amount'), f.get('category'), 
                  f.get('description'), f.get('paymentMethod'), f.get('dekontNumber'), f.get('makbuzNumber')))
            
        conn.commit()
        return jsonify({'status': 'success'})
    except Exception as e:
        conn.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/settings', methods=['GET'])
def get_settings():
    conn = get_db_connection()
    settings = {row['key']: row['value'] for row in conn.execute('SELECT * FROM settings').fetchall()}
    conn.close()
    return jsonify(settings)

@app.route('/api/settings', methods=['POST'])
def update_settings():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    for key, value in data.items():
        cursor.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', (key, value))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
