const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Function to get a list of PDF files in the './in' folder
function getFiles() {
  const folderPath = './in';
  return fs.readdirSync(folderPath).filter(file => file.endsWith(process.env.FILE_EXTENSION));
}

async function sendBatchEmails(transporter, files) {
  const batchSize = 5;
  let currentBatch = [];
  let currentBatchSize = 0;

  for (const pdfFile of files) {
    const filePath = path.join('./in', pdfFile);
    const fileStats = fs.statSync(filePath);
    const fileSizeInBytes = fileStats.size;

    if (currentBatch.length < batchSize && currentBatchSize + fileSizeInBytes <= 25000000) {
      currentBatch.push({
        filename: pdfFile,
        path: filePath
      });
      currentBatchSize += fileSizeInBytes;
    } else {
      await sendEmail(transporter, currentBatch);
      currentBatch = [];
      currentBatchSize = 0;
    }
  }

  if (currentBatch.length > 0) {
    await sendEmail(transporter, currentBatch);
  }

  console.log(`Finished processing files. Total sent: ${files.length}`);
}

async function sendEmail(transporter, attachments) {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: process.env.TO_EMAIL,
    subject: 'PDF Files',
    text: 'Here are the PDF files you requested.',
    attachments
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
    
    for (const attachment of attachments) {
      const oldPath = attachment.path;
      const newPath = path.join('./out', attachment.filename);
      fs.renameSync(oldPath, newPath);
      console.log(`Moved ${attachment.filename} to './out' folder`);
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.FROM_EMAIL,
    pass: process.env.FROM_EMAIL_PASSWORD 
  }
});

const pdfFiles = getFiles();
sendBatchEmails(transporter, pdfFiles);