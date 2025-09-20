import sqlite3
import os

def main():
    db_folder = os.path.join(os.path.dirname(__file__), '..', 'Database')
    os.makedirs(db_folder, exist_ok=True)

    db_path = os.path.join(db_folder, 'schedule.db')

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute('DROP TABLE IF EXISTS residents')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS residents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        pgy INTEGER NOT NULL
    )
    ''')
    conn.commit()

    residents = []

    for i in range(1, 11):
        residents.append((f'res{i}', f'last{i}', 2))

    for i in range(1, 11):
        residents.append((f'res{i + 10}', f'Last{i + 10}', 3))

    for i in range(1, 8):
        residents.append((f'res{i + 20}', f'last{i + 20}', 4))

    cursor.executemany('INSERT INTO residents (first_name, last_name, pgy) VALUES (?, ?, ?)', residents)
    conn.commit()

    conn.close()

if __name__ == "__main__":
    main()