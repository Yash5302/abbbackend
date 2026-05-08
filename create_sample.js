const xlsx = require('xlsx');
const path = require('path');

const data = [
    {
        "Speaker Name": "Suchant",
        "Question": "What are the key risks identified by the board for the coming year?",
        "Category": "General",
        "Short Summary": "The key risks identified for the coming year include strategic, operational, financial, legal, and human capital risks.",
        "Summery": "ABB India has a structured Enterprise Risk Management (ERM) framework to identify, assess, and mitigate risks.",
        "Detailed Points": "Strategic Risks, Operational Risks, etc.",
        "Source": "ABB India Limited Integrated Annual Report 2025.pdf (p. 159, 160, 161)"
    },
    {
        "Speaker Name": "Suchant",
        "Question": "How resilient is the company to macroeconomic and geopolitical uncertainties?",
        "Category": "General",
        "Short Summary": "ABB India demonstrates strong resilience to macroeconomic and geopolitical uncertainties.",
        "Summery": "ABB India has built resilience by adopting a 'local-for-local' strategy.",
        "Detailed Points": "ABB India's 'local-for-local' strategy reduces cross-border dependencies.",
        "Source": "ABB India Limited Integrated Annual Report 2025.pdf (p. 12, 13, 14, 15, 16)"
    }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

const filePath = path.join(__dirname, 'sample_data.xlsx');
xlsx.writeFile(wb, filePath);

console.log(`✅ Sample file created: ${filePath}`);
