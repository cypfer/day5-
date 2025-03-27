const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studentdb', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Student Schema and Model
const studentSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true 
    },
    email: { 
        type: String, 
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    age: {
        type: Number,
        required: true,
        min: 0
    }
}); 

const Student = mongoose.model('Student', studentSchema);

// Welcome Route
app.get('/welcome', (req, res) => {
    res.send('Welcome to Day 5');
});

// Create student
app.post('/students', async (req, res) => {
    try {
        const student = new Student(req.body);
        await student.save();
        res.status(201).send(student);
    } catch (error) {
        res.status(400).send({ 
            message: 'Error creating student', 
            error: error.message 
        });
    }
});

// Read all students
app.get('/students', async (req, res) => {
    try {
        const students = await Student.find();
        res.send(students);
    } catch (error) {
        res.status(500).send({ 
            message: 'Error fetching students', 
            error: error.message 
        });
    }
});

// Update student
app.put('/students/:id', async (req, res) => {
    try {
        const student = await Student.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        
        if (!student) {
            return res.status(404).send({ message: 'Student not found' });
        }
        
        res.send(student);
    } catch (error) {
        res.status(400).send({ 
            message: 'Error updating student', 
            error: error.message 
        });
    }
});

// Delete student
app.delete('/students/:id', async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        
        if (!student) {
            return res.status(404).send({ message: 'Student not found' });
        }
        
        res.send({ message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).send({ 
            message: 'Error deleting student', 
            error: error.message 
        });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = { app, Student };