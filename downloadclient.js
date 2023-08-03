const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');

// Load the proto file and create the gRPC client
const PROTO_PATH = path.join(__dirname, 'fileshareing.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {});
const grpcObject = grpc.loadPackageDefinition(packageDef);
const filesharePackage = grpcObject.filesharePackage;

// Create a gRPC client instance
const client = new filesharePackage.FileService('0.0.0.0:40000', grpc.credentials.createInsecure());

// File details for download
const downloadRequest = {
  id: 'e0915581-ae8a-4f59-9cbd-036fd36cb927', // Replace 'your_file_id_here' with the actual file ID you want to download
};

// Send a gRPC request to download the file
client.download(downloadRequest, (error, response) => {
    if (error) {
      console.error('Error downloading file:', error.message);
    } else {
      console.log(response);
      const fileData = response.filedata;
      const filePath = 'D:/networking-course/grpc-fileshareing/download_storage/' + response.file.filename;
  
      console.log('Saving file to:', filePath);
      fs.writeFileSync(filePath, fileData);
  
      console.log('File downloaded successfully:', response.message);
    }
  });
  
  