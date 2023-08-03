const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Use the path module to get the correct file path for loading the proto file.
const PROTO_PATH = path.join(__dirname, 'fileshareing.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {});
const grpcObject = grpc.loadPackageDefinition(packageDef);
const filesharePackage = grpcObject.filesharePackage;

const { Timestamp } = require('google-protobuf/google/protobuf/timestamp_pb');

const fs = require('fs'); // Use the fs module to access the filesystem

const sqlite3 = require('sqlite3').verbose(); //for saving metadata in sqlite3

const server = new grpc.Server();
server.addService(filesharePackage.FileService.service, {
    upload: upload,
    download: download,
});

server.bindAsync('0.0.0.0:40000', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error('Error starting gRPC server:', err);
    } else {
        console.log('gRPC server started on port:', port);
    }
    server.start();
});
// log the server start time
console.log('Server started at ' + new Date().toLocaleString());
console.log('Server running on 0.0.0.0:40000');


const storagePath = path.join(__dirname, 'storage');

const db = new sqlite3.Database('file_metadata.db');


function upload(call, callback) {
    console.log('Received upload request');
    console.log('received:',call.request)
    console.log('Received file:', call.request.file);
    
    const currentTimestamp = Timestamp.fromDate(new Date());
    const file = {
        "id": call.request.file.id,
        "filename": call.request.file.filename,
        "size": call.request.file.size.toNumber(),
        "path": call.request.file.path,
        "mime_type": call.request.file.mime_type|| '',
        "timestamp": currentTimestamp.toString(),
        "owner": call.request.file.owner,
        "tags": call.request.file.tags
    }
    //log file metadata
    console.log('Received file metadata:', file);
    // log file data
    const fileData = call.request.filedata;
    console.log('Received filedata:', call.request.filedata);

    const filePath = path.join(storagePath, file.filename);
    fs.writeFile(filePath, fileData, (err) => {
        if (err) {
            console.error('Error saving file:', err);
            return callback({
                error_code: { code: 2 }, // UPLOAD_FAILED error code
                error_message: 'Error saving file',
            });
        }

        db.run(
            'INSERT INTO files (id,filename, size, path, mime_type, timestamp, owner, tags) VALUES (?,?, ?, ?, ?, ?, ?, ?)',
            [file.id,file.filename, file.size, filePath, file.mime_type, file.timestamp.toString(), file.owner, JSON.stringify(file.tags)],
            (err) => {
                if (err) {
                    console.error('Error inserting file metadata:', err);
                }
            }
        );

        const response = {
            message: 'Upload successful!',
            file: file,
        };

        callback(null, response);
    });
}


function download(call, callback) {
    console.log('Received download request');
    const id = call.request.id;
    console.log('Received file ID:', id);

    // Ask the database for the whereabouts of the file
    db.get('SELECT * FROM files WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Error getting file metadata from the database:', err);
            return callback({
                error_code: { code: 3 },
                error_message: 'Error getting file metadata from the database',
            });
        }
        // If file metadata is not found, return an error
        if (!row) {
            return callback({
                error_code: { code: 1 }, // File not found error code
                error_message: 'File not found',
            });
        }

        // If file metadata is found, read the file data from the storage folder
        const filePath = row.path;
        const fileData = fs.readFileSync(filePath);

        // Prepare the response to send back to the client
        const response = {
            message: 'Download successful!',
            file: {
                id: row.id,
                filename: row.filename,
                size: row.size,
                path: row.path,
                mime_type: row.mime_type,
                timestamp: row.timestamp,
                owner: row.owner,
                tags: JSON.parse(row.tags),
            },
            filedata: fileData, // Include the actual file data in the response
        };

        // Send the response back to the client
        callback(null, response);
    });
}

// Close the database connection when the server is shutting down
process.on('SIGINT', () => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database connection:', err);
      } else {
        console.log('Database connection closed.');
      }
      process.exit(0);
    });
  });
  