from agent.graph import build_graph

def main():
	hackesh=build_graph()
	result=hackesh.invoke({
		"message":"Hello Hackesh. What can you do?",
		"response":"",
	})
	print("\nHackesh:")
	print(result["response"])
if __name__=="__main__":
	main()

