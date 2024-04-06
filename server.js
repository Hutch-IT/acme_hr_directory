const pg = require('pg');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const client = new pg.Client(process.env.DATABASE_URL ||
    'postgresql://localhost/acme_hr_directory');
app.use(express.json());
app.use(require('morgan')('dev'));

app.get('/api/employees', async (req, res, next) => {
    try {
        const SQl = `SELECT * FROM employees ORDER BY created_at DESC;
        `;
        const response = await client.query(SQl);
        res.send(response.rows);
    } catch (err) {
        next(err);
    }
})

app.get('/api/departments', async (req, res, next) => {
    try {
        const SQL = `
            SELECT * FROM departments;
        `;
        const response = await client.query(SQL);
        res.send(response.rows);

    } catch (err) {
        next(err);
    }
})

app.post('/api/employees', async (req, res, next) => {
    try {
        const SQL = `
            INSERT INTO employees(name, department_id)
            VALUES($1, $2)
            RETURNING *
        `;
        const response = await client.query(SQL, [req.body.name, req.body.department_id]);
        res.send(response.rows[0]);
    } catch (err) {
        next(err)
    }
})

app.delete('/api/employees/:id', async (req, res, next) => {
    try {
        const SQL = `DELETE FROM employees 
                            WHERE id = $1
                            `;
        const response = await client.query(SQL, [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        next(err);
    }
})

app.put('/api/employees/:id', async (req, res, next) => {
    try {
        const SQL = `
            UPDATE employees
            SET name = $1, department_id = $2, updated_at = now()
            WHERE id = $3 RETURNING *
        `;
        const response = await client.query(SQL, [req.body.name,
            req.body.department_id,
            req.params.id]);
        res.send(response.rows[0]);

    } catch (err) {
        next(err);
    }
})


const init = async () => {
    await client.connect();
    console.log('Connected to the database...');
    let SQL = `
          DROP TABLE IF EXISTS employees;
          DROP TABLE IF EXISTS departments;
          CREATE TABLE departments(
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL
          );
          CREATE TABLE employees(
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            department_id INTEGER REFERENCES departments(id) NOT NULL
          );
    `;
    await client.query(SQL);
    console.log('Tables created...');
    SQL = `
        INSERT INTO departments(name) VALUES ('Information Technology'); 
        INSERT INTO departments(name) VALUES ('Human Resources'); 
        INSERT INTO departments(name) VALUES ('Legal'); 
        INSERT INTO employees(name, department_id) VALUES ('John Smith', (SELECT id FROM departments WHERE name='Information Technology'));
        INSERT INTO employees(name, department_id) VALUES ('Tony Hawk', (SELECT id FROM departments WHERE name='Information Technology'));
        INSERT INTO employees(name, department_id) VALUES ('Denzel Washington', (SELECT id FROM departments WHERE name='Legal'));
        INSERT INTO employees(name, department_id) VALUES ('Abraham Lincoln', (SELECT id FROM departments WHERE name='Legal'));
        INSERT INTO employees(name, department_id) VALUES ('Tony Montana', (SELECT id FROM departments WHERE name='Human Resources'));
        INSERT INTO employees(name, department_id) VALUES ('Peter Thiel', (SELECT id FROM departments WHERE name='Human Resources'));
    `;
    await client.query(SQL);
    console.log('Tables Seeded...');

    app.listen(port, () => console.log(`Server started on port: ${port}`));
}

app.use((err, req, res, next) => {
    res.status(err.status || 500).send({error: err.message});
})

init()