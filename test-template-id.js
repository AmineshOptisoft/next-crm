// Quick test script to check if templateId is being saved
// Run this in your browser console after creating an email campaign

fetch('/api/email-campaigns')
  .then(res => res.json())
  .then(data => {
    console.log('All campaigns:', data.data);
    console.log('Campaign with templateId:', data.data.filter(c => c.templateId));
    console.log('Campaigns WITHOUT templateId:', data.data.filter(c => !c.templateId));
  });
