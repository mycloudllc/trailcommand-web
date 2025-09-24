# TrailCommand Web UI - Container Deployment

A containerized React web application for TrailCommand device management, designed for deployment in Kubernetes with Traefik ingress.

## 🚀 Quick Start

### Docker Build

```bash
# Build the container
docker build -t trailcommand/web:latest .

# Run locally
docker run -p 3000:3000 trailcommand/web:latest
```

### Docker Compose with Traefik

```bash
# Start with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f
```

### Kubernetes Deployment

```bash
# Apply all manifests
kubectl apply -k k8s/

# Or apply individually
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/traefik-middleware.yaml
kubectl apply -f k8s/ingress.yaml

# Check deployment status
kubectl get pods -l app=trailcommand-web
kubectl get ingress trailcommand-web
```

## 📦 Container Details

- **Base Image**: `node:18-alpine`
- **Port**: 3000 (HTTP)
- **User**: Non-root (UID 1001)
- **Health Checks**: `/health` and `/ready` endpoints
- **SSL**: Terminated at ingress/proxy level

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `PORT` | `3000` | HTTP server port |
| `HOST` | `0.0.0.0` | Bind address |

### Health Endpoints

- **`GET /health`** - Liveness probe (uptime, version, status)
- **`GET /ready`** - Readiness probe (build directory check)
- **`GET /metrics`** - Basic metrics (memory, CPU, uptime)

## 🛡️ Security Features

- Non-root container execution
- Read-only root filesystem
- No privilege escalation
- Comprehensive security headers
- Rate limiting via Traefik middleware

## 🌐 Traefik Integration

The application is designed to work with Traefik as an ingress controller:

- **SSL/TLS**: Terminated at Traefik level
- **Domain**: `app.trailcommandpro.com`
- **Certificates**: Auto-managed via cert-manager + Let's Encrypt
- **Middleware**: Security headers, compression, rate limiting

## 📊 Monitoring

- **Liveness Probe**: `GET /health` every 30s
- **Readiness Probe**: `GET /ready` every 10s
- **Metrics**: Available at `GET /metrics`

## 🔄 Updates

```bash
# Update image tag in kustomization.yaml
# Then apply
kubectl apply -k k8s/

# Or update deployment directly
kubectl set image deployment/trailcommand-web trailcommand-web=trailcommand/web:v1.1.0
```

## 📋 Prerequisites

- Docker or Kubernetes cluster
- Traefik ingress controller
- cert-manager (for SSL certificates)
- Domain pointing to cluster

## 🚨 Troubleshooting

### Container won't start
```bash
# Check logs
docker logs trailcommand-web
kubectl logs -l app=trailcommand-web

# Check build directory
docker run --rm trailcommand/web:latest ls -la /app/build
```

### SSL/TLS issues
- Verify cert-manager is installed and configured
- Check ingress annotations match your Traefik setup
- Ensure DNS points to cluster

### Health check failures
```bash
# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/ready
```