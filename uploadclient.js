const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // for giving unique id to files

// Load the proto file and create the gRPC client
const PROTO_PATH = path.join(__dirname, 'fileshareing.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {});
const grpcObject = grpc.loadPackageDefinition(packageDef);
const filesharePackage = grpcObject.filesharePackage;

// Create a gRPC client instance
const client = new filesharePackage.FileService('0.0.0.0:40000', grpc.credentials.createInsecure());

const fileId = uuidv4();

// File details for upload
const fileDetails = {
  id: fileId,
  filename: 'testpdf.pdf',
  size: fs.statSync('D:/general purpose test files/testpdf.pdf').size,
  path: 'D:/general purpose test files/testpdf.pdf',
  mime_type: 'application/pdf',
  owner: 'Numan Kavurmacı',
  tags: ['important', 'docs'],
};

// Read the file content
const fileData = fs.readFileSync(fileDetails.path);

// Convert the file data to Uint8Array
const fileDataUint8 = new Uint8Array(fileData);

//console.log('File data:', fileDataUint8);


// Send a gRPC request to upload the file
const uploadRequest = {
  file: {
    ...fileDetails,
  },
  filedata: fileDataUint8,
};
console.log('Sending upload request:', uploadRequest);

client.upload(uploadRequest, (error, response) => {
  if (error) {
    console.error('Error uploading file:', error.message);
  } else {
    console.log('File uploaded successfully:', response.message);
  }
});
