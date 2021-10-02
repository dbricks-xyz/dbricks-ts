import winston from 'winston';

require('dotenv').config();

winston.configure({
  level: process.env.DEBUG ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.json(),
    winston.format.prettyPrint(),
    winston.format.colorize({ all: true }),
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

export * from './serum';
export * from './mango';
export * from './common';
