# Deployment Guide

## Architecture Overview

The system consists of three main components:
1. React Frontend (Web Dashboard)
2. Node.js Backend (API Server)
3. Python Detection Script (Running on Jetson/Camera)
4. PostgreSQL Database (AWS RDS)

## Network Requirements

### Development Environment
- All components can run on localhost
- Uses public MQTT broker (broker.emqx.io)
- Frontend: localhost:5173
- Backend: localhost:5000
- Database: localhost:5432

### Production Environment (AWS)

#### EC2 Instance (hse-vision)
- Hosts the Node.js backend
- Serves the React frontend (built files)
- Requires:
  - Inbound rules for HTTP (80), HTTPS (443)
  - Access to RDS security group (5432)
  - Public IP for external access

#### RDS Instance
- PostgreSQL databasewhy 
- In private subnet
- Only accessible from EC2 instance
- Not directly accessible from internet

#### Network Flow
1. Users access dashboard via EC2 public IP/domain
2. Frontend makes API calls to backend on same EC2
3. Backend connects to RDS in private subnet
4. Python script sends MQTT messages to broker
5. Dashboard receives MQTT messages via WebSocket

