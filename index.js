const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Function to get a list of PDF files in the './in' folder
function getPdfFiles() {
  const folderPath = './in';
  return fs.readdirSync(folderPath).filter(file => file.endsWith('.pdf'));
}

// Function to send a batch of PDF files via email
async function sendBatchEmails(transporter, pdfFiles) {
  const batchSize = 5;
  let currentBatch = [];
  let currentBatchSize = 0;

  for (const pdfFile of pdfFiles) {
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

  // Send any remaining files
  if (currentBatch.length > 0) {
    await sendEmail(transporter, currentBatch);
  }
}

// Function to send an email with attachments
async function sendEmail(transporter, attachments) {
  const mailOptions = {
    from: process.env.FROM_EMAIL, // Your email address
    to: process.env.TO_EMAIL, // Recipient's email address
    subject: 'PDF Files',
    text: 'Here are the PDF files you requested.',
    attachments: attachments
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
    
    // Move sent files to the './out' folder
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

// Configure the SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.FROM_EMAIL,
    pass: process.env.FROM_EMAIL_PASSWORD 
  }
});

// Get the list of PDF files and send them in batches
const pdfFiles = getPdfFiles();
sendBatchEmails(transporter, pdfFiles);