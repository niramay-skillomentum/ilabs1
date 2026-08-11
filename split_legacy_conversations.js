require('dotenv').config();
const mongoose = require('mongoose');

async function splitConversations() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  // Find all conversations that have mixed messages (CPTY and FO)
  // We can just iterate all conversations and split them.
  const cursor = db.collection('conversations').find({});
  let count = 0;
  
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    
    // Check if it has multiple desks or mixed messages
    let hasFO = false;
    let hasCpty = false;
    for (const m of doc.messages) {
      if (m.sender === 'FO' || m.subject.includes('FO Response')) hasFO = true;
      if (m.sender === 'COUNTERPARTY' || m.body.includes('Dear Counterparty')) hasCpty = true;
    }
    
    if (hasFO && hasCpty) {
      console.log(`Splitting mixed conversation for trade: ${doc.tradeRef}`);
      
      const moMessages = [];
      const confMessages = [];
      
      for (const m of doc.messages) {
        if (m.sender === 'COUNTERPARTY' || m.body.includes('Dear Counterparty') || m.subject.includes('Trade Inquiry')) {
          confMessages.push(m);
        } else {
          // Default to MO for FO queries
          moMessages.push(m);
        }
      }
      
      // Update the existing document to be MO only
      await db.collection('conversations').updateOne(
        { _id: doc._id },
        { 
          $set: { 
            desk: 'MO', 
            messages: moMessages,
            desks: ['MO']
          } 
        }
      );
      
      // Create a new document for CONFIRMATION
      // Make sure it doesn't already exist
      const existingConf = await db.collection('conversations').findOne({ tradeRef: doc.tradeRef, desk: 'CONFIRMATION' });
      if (!existingConf) {
        await db.collection('conversations').insertOne({
          tradeRef: doc.tradeRef,
          desk: 'CONFIRMATION',
          desks: ['CONFIRMATION'],
          messages: confMessages,
          readBy: doc.readBy,
          status: doc.status,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        });
      }
      count++;
    }
  }
  
  console.log(`Split ${count} legacy conversations.`);
  process.exit(0);
}

splitConversations().catch(console.error);
