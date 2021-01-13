# Redmine to OpenProject migration

**WARNING: READ THAT WHOLE README BEFORE EXECUTING.**  
**I AM NOT RESPONSIBLE OF ANY DATA LOSS.**

This project has been tested only with one instance, don't forget to backup BOTH of your databases before trying this migration  
This migration system doesn't migrate every table, I only written migration code for the tables I needed  

## Versions used

Redmine 4.1.1-stable  
Openproject 11.1.1  
PostgreSQL 12.3  

## How to use it ?

1) Backup both databases

2) Fill credentials in the first lines of app.js

3) Migrate

```bash
npm install
node app
```