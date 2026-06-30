#!/bin/bash
set -e

# Talaria Web Client Deployment Script
# This script sets up Talaria for production deployment on a Linux server

echo "=== Talaria Web Client Deployment ==="
echo ""

# Configuration
DOMAIN=${1:-"talaria.example.com"}
INSTALL_DIR="/var/www/talaria"
NGINX_CONF="/etc/nginx/sites-available/talaria"

echo "Domain: $DOMAIN"
echo "Install directory: $INSTALL_DIR"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

# Update system
echo "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

# Install dependencies
echo "Installing dependencies..."
apt-get install -y -qq nginx certbot python3-certbot-nginx

# Create installation directory
echo "Creating installation directory..."
mkdir -p "$INSTALL_DIR"

# Copy built files
echo "Copying application files..."
if [ ! -d "dist" ]; then
    echo "Error: dist/ directory not found. Run 'pnpm build' first."
    exit 1
fi

cp -r dist/* "$INSTALL_DIR/dist/"
chown -R www-data:www-data "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"

# Configure nginx
echo "Configuring nginx..."
sed "s/talaria.example.com/$DOMAIN/g" nginx/talaria.conf > "$NGINX_CONF"
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/talaria
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx

# Obtain SSL certificate
echo "Obtaining SSL certificate..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@"$DOMAIN"

# Enable auto-renewal
echo "Enabling certificate auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Install systemd service (optional - for development server)
echo "Installing systemd service..."
cp systemd/talaria.service /etc/systemd/system/talaria.service
systemctl daemon-reload

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Talaria is now available at: https://$DOMAIN"
echo ""
echo "To start the development server (optional):"
echo "  systemctl start talaria"
echo "  systemctl enable talaria"
echo ""
echo "To update Talaria in the future:"
echo "  1. Run 'pnpm build' on your development machine"
echo "  2. Copy the dist/ directory to the server"
echo "  3. Run: cp -r dist/* /var/www/talaria/dist/"
echo "  4. Run: systemctl restart nginx"
echo ""
