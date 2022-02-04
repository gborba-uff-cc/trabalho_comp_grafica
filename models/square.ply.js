export default `\
ply
format ascii 1.0
element vertex 4
property float x
property float y
property float z
element face 2
property list uchar uint vertex_indices
end_header
0 0 0
0 0 1
1 0 1
1 0 0
3 0 1 3
3 1 2 3
`