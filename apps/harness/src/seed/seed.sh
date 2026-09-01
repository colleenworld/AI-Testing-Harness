# Set up database access environment parameter blocks to reach your local instance (adjust if using Docker)
export DB_HOST=192.168.1.78
export DB_USER=eval_admin
export DB_PASSWORD=local_secure_password_123
export DB_NAME=llm_evals
export DB_PORT=5432

# Execute your new database data seeding script
npx ts-node ./seed.ts