from langchain_core.tools import tool

@tool
def calculator(expression: str) -> str:
	"""
	Calculate a mathematical expression.
	
	Use this tool when the user asks for arithmatic calculations.
	Example: 25*48
	"""
	try:
		#v1: Simple arithmatic evaluation
		result=eval(expression, {"__builtins__":{}},{})
		return str(result)
	except Exception as e:
		return f"Could not calculate the expression: {e}"
