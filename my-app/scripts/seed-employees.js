// Quick script to add sample employees via the browser console
// Navigate to /dashboard/employees and run this in the console

const sampleEmployees = [
  {
    firstName: "Olivia",
    lastName: "Martin",
    email: "olivia.martin@email.com",
    position: "Senior Developer",
    department: "Engineering",
    salary: 1999,
    status: "active",
    hireDate: "2023-01-15"
  },
  {
    firstName: "Jackson",
    lastName: "Lee",
    email: "jackson.lee@email.com",
    position: "Product Manager",
    department: "Product",
    salary: 39,
    status: "active",
    hireDate: "2023-03-20"
  },
  {
    firstName: "Isabella",
    lastName: "Nguyen",
    email: "isabella.nguyen@email.com",
    position: "Designer",
    department: "Design",
    salary: 2299,
    status: "active",
    hireDate: "2023-05-10"
  },
  {
    firstName: "William",
    lastName: "Kim",
    email: "william.kim@email.com",
    position: "Sales Manager",
    department: "Sales",
    salary: 89,
    status: "active",
    hireDate: "2023-02-28"
  },
  {
    firstName: "Sofia",
    lastName: "Davis",
    email: "sofia.davis@email.com",
    position: "Marketing Lead",
    department: "Marketing",
    salary: 39,
    status: "active",
    hireDate: "2023-04-05"
  }
];

async function seedEmployees() {
  for (const employee of sampleEmployees) {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee)
      });
      const data = await response.json();
      console.log('Created:', data);
    } catch (error) {
      console.error('Error creating employee:', error);
    }
  }
  console.log('Done! Refresh the page to see the employees.');
}

// Uncomment the line below to run the seed
// seedEmployees();
