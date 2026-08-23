from langchain_ollama import ChatOllama

def main():
	llm=ChatOllama(
		model="qwen3:4b",
		temperature=0,
	)
	response = llm.invoke(
		"You are Hackesh, my personal AI assistant, "
		"Introduce yourself in one short sentence. "
	)
	print("\nHackesh:", response.content)
if __name__=="__main__":
	main()

