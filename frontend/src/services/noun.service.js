import axios from "axios";

export default class NounService {
    static async getQuestion(id) {
        const ruta = `http://localhost:4001/api/noun/${id}`;

        try {
            const response = await axios.get(ruta);
            return response.data; // Return the data directly
        } catch (error) {
            throw new Error(
                error.response?.data?.message || "An error occurred while fetching the noun."
            );
        }
    }
}