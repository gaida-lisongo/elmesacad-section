# MongoDB Connection Troubleshooting

## Common Issues and Solutions

### 1. ECONNREFUSED Error
```
[connectDB] MongoDB: querySrv ECONNREFUSED _mongodb._tcp.cluster0.yj4ji.mongodb.net
```

This error indicates that the application cannot establish a network connection to the MongoDB server.

#### Solutions:

1. **Check IP Whitelist in MongoDB Atlas**
   - Log in to MongoDB Atlas
   - Go to Network Access section
   - Ensure your current IP address is whitelisted
   - For development, you can temporarily add `0.0.0.0/0` (not recommended for production)

2. **Verify Network Connectivity**
   - Check your internet connection
   - Try accessing other websites to confirm connectivity
   - If behind a corporate firewall, contact your network administrator

3. **Check MongoDB Atlas Cluster Status**
   - Log in to MongoDB Atlas
   - Verify that your cluster is running and not paused

4. **Verify Credentials**
   - Double-check the username and password in your connection string
   - Ensure special characters in the password are properly URL-encoded

### 2. Authentication Failed Error

#### Solutions:
1. **Verify Username and Password**
   - Log in to MongoDB Atlas
   - Go to Database Access section
   - Verify the user exists and has proper permissions

2. **Reset Password**
   - In MongoDB Atlas, go to Database Access
   - Edit the user and reset the password
   - Update your `.env.local` file with the new password

### 3. Testing the Connection

#### Using the Test API Route
Visit `http://localhost:3000/api/test-db` to test the MongoDB connection.

#### Using the Command Line Script
Run the following command to test the connection:
```bash
npm run test:db
```

### 4. Connection String Format

Ensure your MongoDB URI in `.env.local` follows this format:
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?<options>
```

Example:
```
MONGODB_URI=mongodb+srv://section-admin:YZP5cM66bg8keLZc@cluster0.yj4ji.mongodb.net/db-inbtp?retryWrites=true&w=majority&tls=true&serverSelectionTimeoutMS=5000
```

### 5. Additional Connection Options

The following options have been added to improve connection reliability:
- `tls=true`: Ensures TLS/SSL connection
- `serverSelectionTimeoutMS=5000`: Reduces timeout for server selection
- `connectTimeoutMS=10000`: Sets connection timeout
- `socketTimeoutMS=20000`: Sets socket timeout

### 6. Using Local MongoDB for Development

If you prefer to use a local MongoDB instance:

1. Install MongoDB locally or use Docker:
   ```bash
   docker run --name mongodb -p 27017:27017 -d mongo
   ```

2. Update your `.env.local`:
   ```
   MONGODB_URI=mongodb://localhost:27017/db-inbtp
   ```

### 7. Debugging Steps

1. **Check Environment Variables**
   ```bash
   # Verify MONGODB_URI is set
   echo $MONGODB_URI
   ```

2. **Test Connection with MongoDB Shell**
   ```bash
   mongosh "mongodb+srv://section-admin:YZP5cM66bg8keLZc@cluster0.yj4ji.mongodb.net/db-inbtp"
   ```

3. **Check MongoDB Atlas Logs**
   - In MongoDB Atlas, go to the cluster's Metrics section
   - Check for any connection errors or issues

4. **Verify DNS Resolution**
   ```bash
   # Test DNS resolution for MongoDB cluster
   nslookup cluster0.yj4ji.mongodb.net
   ```

If you continue to experience issues, please contact your system administrator or MongoDB support.