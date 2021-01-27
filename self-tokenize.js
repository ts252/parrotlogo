function tokenize(src){
    function singlechar(name, char){
      return {
        name: name,
        read: (s, tokens) => {
          if(s.peek() == char){
            tokens.push({tok: s.read(), pos: s.pos - 1, type: name})
            return true        
          }
          return false        
        }
      }
    }
  
    const TOKENTYPES = [
      {
        name: "ws",
        read: (s, tokens) => {
          let accepted = false
          while(" \n\t\r".includes(s.peek())){
            accepted = true
            s.read()
          }
          return accepted
        }
      },
      {
        name: "comment",
        read: (s, tokens) => {        
          if(s.peek() == ";"){
            let tok = ";"
            while(!("\n\0".includes(s.peek()))){            
              tok += s.read()
            }
            tokens.push({type: "comment", tok: tok, pos: s.pos - tok.length})
          }
          return false
        }
      },
      {
        name: "word",
        read: (s, tokens) => {        
          let tok = ""
          if(/[_A-Za-z]/.exec(s.peek())){          
            tok += s.read()
            while(/[_A-Za-z0-9]/.exec(s.peek())){          
              tok += s.read()
            }
            tokens.push({tok: tok, type: "word", pos: s.pos - tok.length})
            return true          
          }
          return false
        }
      },
      {
        name: "label",
        read: (s, tokens) => {        
          let tok = ""
          if(s.peek() == ":"){          
            tok += s.read()
            while(/[_A-Za-z0-9]/.exec(s.peek())){          
              tok += s.read()
            }
            tokens.push({tok: tok, type: "label", pos: s.pos - tok.length})
            return true          
          }
          return false
        }
      },
      {
        name: "number",
        read: (s, tokens) => {        
          let tok = ""
          if(/[0-9]/.exec(s.peek())){          
            tok += s.read()
            while(/[0-9.]/.exec(s.peek())){          
              tok += s.read()            
            }
            if(s.peek() == "."){
              tok += s.read()
              while(/[0-9.]/.exec(s.peek())){          
                tok += s.read()            
              } 
            }
            tokens.push({tok: tok, type: "number", pos: s.pos - tok.length})
            return true 
          }
          return false
        }
      },
      {
        name: "operator",
        read: (s, tokens) => {                
          if("+*/".includes(s.peek())){          
            tokens.push({tok: s.read(), type: "operator", pos: s.pos - 1})
            return true 
          }
          return false
        }
      },
      singlechar("minus", "-"),
      singlechar("openbracket", "("),
      singlechar("openblock", "["),
      singlechar("closebracket", ")"),
      singlechar("closeblock", "]"),
      {
        name: "bad",
        read: (s, tokens) => {
          tok = ""
          while(!(" \t\n\r\0".includes(s.peek()))){
            tok += s.read()
          }
          tokens.push({tok: tok, type: "bad", pos: s.pos - tok.length})
          return true 
        }
      }
    ]
  
  
    let s = {
      s: src,
      pos: 0,
      read: function(){
        return this.pos < this.s.length ? this.s[this.pos++] : "\0"
      },
      peek: function(){
        return this.pos < this.s.length ? this.s[this.pos] : "\0"
      },
      pushback: function(num){
        this.pos -= num
      },
    }
  
    let tokens = []
  
    
    while(s.peek() != "\0"){
      for(let t of TOKENTYPES){
        if(t.read(s, tokens)){
          break;
        }
      }
    }   
  
    console.debug(tokens)
  }