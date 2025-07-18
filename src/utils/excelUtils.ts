import * as XLSX from 'xlsx';
import { egyptianGovernorates } from '../types/company';

export interface ExcelCompanyData {
  name: string;
  email: string;
  categoryName: string;
  location: string;
  establishmentDate?: string;
  description?: string;
  phone?: string;
  website?: string;
}

// Generate Excel template for bulk company upload
export const generateCompanyTemplate = (categories: { id: string; name: string }[]) => {
  // Create sample data with instructions
  const templateData = [
    {
      'Company Name (Required)': 'Example Company Ltd',
      'Email (Optional)': 'info@example.com',
      'Category (Required)': categories.length > 0 ? categories[0].name : 'Real Estate Developer',
      'Location (Required)': 'Cairo',
      'Establishment Year (Optional)': '1995',
      'Description (Optional)': 'Leading real estate company...',
      'Phone (Optional)': '+20123456789',
      'Website (Optional)': 'https://example.com'
    },
    {
      'Company Name (Required)': 'Company Without Account',
      'Email (Optional)': '',
      'Category (Required)': categories.length > 1 ? categories[1].name : 'Real Estate Broker',
      'Location (Required)': 'Alexandria',
      'Establishment Year (Optional)': '2010',
      'Description (Optional)': 'This company will be created without an account',
      'Phone (Optional)': '',
      'Website (Optional)': ''
    }
  ];

  // Create instructions sheet
  const instructions = [
    { Field: 'Company Name', Description: 'Full company name (Required)', Example: 'ABC Real Estate Development' },
    { Field: 'Email', Description: 'Company email address (Optional)', Example: 'contact@abc-realestate.com' },
    { Field: 'Category', Description: 'Company type from available categories (Required)', Example: 'Real Estate Developer' },
    { Field: 'Location', Description: 'Egyptian governorate (Required)', Example: 'Cairo' },
    { Field: 'Establishment Year', Description: 'Year company was established, 1500-2025 (Optional)', Example: '1995' },
    { Field: 'Description', Description: 'Company description (Optional)', Example: 'Leading development company...' },
    { Field: 'Phone', Description: 'Contact phone number (Optional)', Example: '+20123456789' },
    { Field: 'Website', Description: 'Company website URL (Optional)', Example: 'https://company.com' },
    { Field: 'Note', Description: 'If email is provided, a user account will be created (claimed company)', Example: '' },
    { Field: 'Note', Description: 'If email is empty, the company will be created without an account (unclaimed)', Example: '' }
  ];

  // Valid categories list
  const validCategories = [
    { Category: 'Available Categories' },
    ...categories.map(cat => ({ Category: cat.name }))
  ];

  // Valid locations list
  const validLocations = [
    { Location: 'Available Locations' },
    ...egyptianGovernorates.map(gov => ({ Location: gov.name }))
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Add template sheet
  const templateWs = XLSX.utils.json_to_sheet(templateData);
  XLSX.utils.book_append_sheet(wb, templateWs, 'Companies Template');

  // Add instructions sheet
  const instructionsWs = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');

  // Add categories sheet
  const categoriesWs = XLSX.utils.json_to_sheet(validCategories);
  XLSX.utils.book_append_sheet(wb, categoriesWs, 'Valid Categories');

  // Add locations sheet
  const locationsWs = XLSX.utils.json_to_sheet(validLocations);
  XLSX.utils.book_append_sheet(wb, locationsWs, 'Valid Locations');

  // Generate file
  const fileName = `companies_template_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// Parse Excel file and extract company data
export const parseCompaniesExcel = (file: File, categories: { id: string; name: string }[]): Promise<ExcelCompanyData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet (should be the companies template)
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        // Validate and transform data
        const companies: ExcelCompanyData[] = [];
        const errors: string[] = [];
        
        jsonData.forEach((row, index) => {
          const rowNumber = index + 2; // +2 because Excel is 1-indexed and we have headers
          
          // Skip empty rows
          if (!row['Company Name (Required)']) {
            return;
          }
          
          // Validate required fields
          const name = row['Company Name (Required)']?.toString().trim();
          const email = row['Email (Optional)']?.toString().trim() || '';
          const categoryName = row['Category (Required)']?.toString().trim();
          const location = row['Location (Required)']?.toString().trim();
          const establishmentDate = row['Establishment Year (Optional)']?.toString().trim() || '';
          
          if (!name) {
            errors.push(`Row ${rowNumber}: Company Name is required`);
          }
          if (!categoryName) {
            errors.push(`Row ${rowNumber}: Category is required`);
          }
          if (!location) {
            errors.push(`Row ${rowNumber}: Location is required`);
          }
          
          // Validate email and password consistency
          if (email && !email.includes('@')) {
            errors.push(`Row ${rowNumber}: Invalid email format`);
          }
          
          // Validate establishment date if provided
          if (establishmentDate) {
            const year = parseInt(establishmentDate);
            if (isNaN(year) || year < 1500 || year > 2025 || establishmentDate.length !== 4) {
              errors.push(`Row ${rowNumber}: Establishment year must be between 1500 and 2025`);
            }
          }
          
          // Validate category exists
          if (categoryName && !categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase())) {
            errors.push(`Row ${rowNumber}: Invalid category "${categoryName}"`);
          }
          
          // Validate location exists
          if (location && !egyptianGovernorates.find(gov => gov.name.toLowerCase() === location.toLowerCase())) {
            errors.push(`Row ${rowNumber}: Invalid location "${location}"`);
          }
          
          // If no validation errors for required fields, add to companies array
          if (name && categoryName && location) {
            companies.push({
              name,
              email,
              categoryName,
              location,
              establishmentDate,
              description: row['Description (Optional)']?.toString().trim() || '',
              phone: row['Phone (Optional)']?.toString().trim() || '',
              website: row['Website (Optional)']?.toString().trim() || ''
            });
          }
        });
        
        if (errors.length > 0) {
          reject(new Error(`Validation errors found:\n${errors.join('\n')}`));
          return;
        }
        
        if (companies.length === 0) {
          reject(new Error('No valid company data found in the Excel file'));
          return;
        }
        
        resolve(companies);
      } catch (error) {
        reject(new Error('Failed to parse Excel file. Please make sure it follows the correct template format.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};